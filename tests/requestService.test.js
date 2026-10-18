const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequestService } = require('../server/src/services/requestService');
const { createMemoryRepositories } = require('./support/memoryRepositories');

const requester = { id: 'requester-1', role: 'requester', name: 'Requester' };
const staff = { id: 'staff-1', role: 'staff', name: 'Staff member' };
const manager = { id: 'manager-1', role: 'management', name: 'Manager' };
const details = {
  title: 'Broken streetlight',
  description: 'The light outside the library is not working.',
  category: 'street_lighting',
  location: 'Library Road',
  priority: 'high',
};

async function setup() {
  const repositories = createMemoryRepositories();
  await repositories.userRepository.create({
    ...staff,
    _id: staff.id,
    email: 'staff@example.test',
    passwordHash: 'not-used-by-request-service',
  });
  await repositories.userRepository.create({
    ...manager,
    _id: manager.id,
    email: 'manager@example.test',
    passwordHash: 'not-used-by-request-service',
  });
  const service = createRequestService({
    requestRepository: repositories.requestRepository,
    userRepository: repositories.userRepository,
  });
  return { ...repositories, service };
}

test('submitting a request assigns its requester and starts at submitted', async () => {
  const { service } = await setup();
  const request = await service.create(requester, details);

  assert.equal(request.status, 'submitted');
  assert.equal(request.requester.id, requester.id);
  assert.equal(request.title, details.title);
  assert.deepEqual(request.statusHistory, []);
});

test('assignment and every permitted status transition append an auditable history entry', async () => {
  const { service } = await setup();
  const created = await service.create(requester, details);
  let request = await service.assign(staff, created.id, {});
  assert.equal(request.status, 'assigned');

  for (const status of ['in_progress', 'resolved', 'closed']) {
    request = await service.transition(staff, created.id, { status });
  }

  assert.equal(request.status, 'closed');
  assert.deepEqual(
    request.statusHistory.map(({ fromStatus, toStatus, changedBy }) => [
      fromStatus,
      toStatus,
      changedBy.id,
    ]),
    [
      ['submitted', 'assigned', staff.id],
      ['assigned', 'in_progress', staff.id],
      ['in_progress', 'resolved', staff.id],
      ['resolved', 'closed', staff.id],
    ]
  );
  assert.ok(request.statusHistory.every((entry) => entry.changedAt instanceof Date));
});

test('invalid status transitions fail without changing status or audit history', async () => {
  const { service } = await setup();
  const created = await service.create(requester, details);
  await service.assign(staff, created.id, {});

  await assert.rejects(
    service.transition(staff, created.id, { status: 'resolved' }),
    { statusCode: 409 }
  );

  const unchanged = await service.getById(requester, created.id);
  assert.equal(unchanged.status, 'assigned');
  assert.equal(unchanged.statusHistory.length, 1);
});

test('requesters see controlled status history but not internal staff notes', async () => {
  const { service } = await setup();
  const created = await service.create(requester, details);
  await service.assign(staff, created.id, {});
  await service.addComment(staff, created.id, { body: 'Internal triage note' });

  const requesterView = await service.getById(requester, created.id);
  const staffView = await service.getById(staff, created.id);

  assert.equal(requesterView.comments, undefined);
  assert.deepEqual(requesterView.statusHistory[0], {
    status: 'assigned',
    changedAt: requesterView.statusHistory[0].changedAt,
  });
  assert.equal(staffView.comments[0].body, 'Internal triage note');
  assert.equal(staffView.comments[0].author.id, staff.id);
});

test('management summary counts open, due, resolved and closed requests', async () => {
  const { service } = await setup();
  const first = await service.create(requester, details);
  const second = await service.create(requester, { ...details, title: 'Pothole' });

  await service.setDueAt(manager, first.id, {
    dueAt: new Date(Date.now() - 60_000).toISOString(),
  });
  await service.assign(staff, second.id, {});
  await service.transition(staff, second.id, { status: 'in_progress' });
  await service.transition(staff, second.id, { status: 'resolved' });

  assert.deepEqual(await service.summary(manager), {
    open: 1,
    overdue: 1,
    resolved: 1,
    closed: 0,
    byCategory: [{ _id: 'street_lighting', total: 2, open: 1, overdue: 1 }],
  });
});

test('overlapping status updates allow only the first atomic transition', async () => {
  const { service } = await setup();
  const created = await service.create(requester, details);
  await service.assign(staff, created.id, {});

  const outcomes = await Promise.allSettled([
    service.transition(staff, created.id, { status: 'in_progress' }),
    service.transition(staff, created.id, { status: 'in_progress' }),
  ]);
  const finalRequest = await service.getById(staff, created.id);

  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(finalRequest.status, 'in_progress');
  assert.equal(finalRequest.statusHistory.length, 2);
});
