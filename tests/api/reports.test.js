// FR-007 management monitoring and the requester-to-staff service journey.
const db = require('../helpers/db');
const { api, makeUser, validBody, submitRequest, setStatus, ServiceRequest } = require('../helpers/factory');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

test('management can filter open, overdue, resolved and closed service requests', async () => {
  const requester = await makeUser('requester');
  const staff = await makeUser('staff');
  const manager = await makeUser('management');

  const open = await submitRequest(requester, validBody({ title: 'Open request one' }));
  const overdue = await submitRequest(requester, validBody({ title: 'Overdue request two' }));
  const resolved = await submitRequest(requester, validBody({ title: 'Resolved request three' }));
  const closed = await submitRequest(requester, validBody({ title: 'Closed request four' }));

  await ServiceRequest.updateOne(
    { _id: overdue.id },
    { dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  );

  for (const request of [resolved, closed]) {
    await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({});
    await setStatus(request.id, staff, 'in_progress');
    await setStatus(request.id, staff, 'resolved', { comment: 'Fixed' });
  }
  await setStatus(closed.id, staff, 'closed');

  const list = (status) => api()
    .get(`/api/requests${status ? `?status=${status}` : ''}`)
    .set(manager.auth);
  expect((await list('open')).body.total).toBe(2);
  expect((await list('overdue')).body.items.map((item) => item.id)).toEqual([overdue.id]);
  expect((await list('resolved')).body.items.map((item) => item.id)).toEqual([resolved.id]);
  expect((await list('closed')).body.items.map((item) => item.id)).toEqual([closed.id]);
  expect((await list('')).body.total).toBe(4);

  const result = await api().get('/api/requests/summary').set(manager.auth);
  expect(result.body.summary).toMatchObject({ open: 2, overdue: 1, resolved: 1, closed: 1 });
  expect(result.body.summary.byCategory[0]).toMatchObject({
    _id: 'roads',
    total: 4,
    open: 2,
    overdue: 1,
  });
  expect(open.id).toBeTruthy();
});

test('requester tracks a staff-resolved issue and management sees its audit history', async () => {
  const requester = await makeUser('requester');
  const staff = await makeUser('staff');
  const manager = await makeUser('management');

  const request = await submitRequest(requester);
  await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({});
  await setStatus(request.id, staff, 'in_progress');
  await setStatus(request.id, staff, 'resolved', { comment: 'Pothole repaired' });

  const requesterView = await api().get(`/api/requests/${request.id}`).set(requester.auth);
  expect(requesterView.body.request.status).toBe('resolved');
  expect(requesterView.body.request.statusHistory.map((entry) => entry.status)).toEqual([
    'assigned',
    'in_progress',
    'resolved',
  ]);

  const managementView = await api().get(`/api/requests/${request.id}`).set(manager.auth);
  expect(managementView.body.request.statusHistory.at(-1).comment).toBe('Pothole repaired');
  expect(managementView.body.request.statusHistory.every((entry) => entry.changedBy && entry.changedAt)).toBe(true);
});
