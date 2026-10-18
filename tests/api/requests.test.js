// FR-001..FR-006 are exercised through the Express API and a MongoDB test database.
const db = require('../helpers/db');
const { api, makeUser, validBody, submitRequest, setStatus } = require('../helpers/factory');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

describe('FR-001 requester submits a service request', () => {
  test('valid submissions receive unique identifiers and begin as submitted', async () => {
    const requester = await makeUser('requester');
    const first = await submitRequest(requester);
    const second = await submitRequest(requester);

    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
    expect(first.status).toBe('submitted');
  });

  test('invalid required fields are rejected and no request is persisted', async () => {
    const requester = await makeUser('requester');
    const response = await api()
      .post('/api/requests')
      .set(requester.auth)
      .send(validBody({ title: '', category: 'unknown' }));

    expect(response.status).toBe(400);
    expect(response.body.details).toHaveProperty('title');
    expect(response.body.details).toHaveProperty('category');
    expect((await api().get('/api/requests').set(requester.auth)).body.total).toBe(0);
  });
});

describe('FR-002 requester sees their current controlled status', () => {
  test('requesters only see their own requests', async () => {
    const requester = await makeUser('requester');
    const other = await makeUser('requester');
    const staff = await makeUser('staff');
    const assigned = await submitRequest(requester);
    await submitRequest(requester, validBody({ title: 'Water leak in the park' }));
    await submitRequest(other);
    await api().post(`/api/requests/${assigned.id}/assign`).set(staff.auth).send({});

    const list = await api().get('/api/requests').set(requester.auth);
    expect(list.body.total).toBe(2);
    expect(list.body.items.map((item) => item.status).sort()).toEqual(['assigned', 'submitted']);
  });

  test('a requester cannot open another request or see internal staff information', async () => {
    const requester = await makeUser('requester');
    const other = await makeUser('requester');
    const staff = await makeUser('staff');
    const request = await submitRequest(other);
    await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({});
    await api().post(`/api/requests/${request.id}/comments`).set(staff.auth).send({ body: 'Internal note' });

    const forbidden = await api().get(`/api/requests/${request.id}`).set(requester.auth);
    expect(forbidden.status).toBe(404);
    expect(JSON.stringify(forbidden.body)).not.toContain(request.title);

    const visible = await api().get(`/api/requests/${request.id}`).set(other.auth);
    expect(visible.body.request.assignee).toBeUndefined();
    expect(visible.body.request.comments).toBeUndefined();
    expect(visible.body.request.statusHistory[0].status).toBe('assigned');
    expect(JSON.stringify(visible.body)).not.toContain('Internal note');
  });
});

describe('FR-003 / FR-004 staff queue and assignment', () => {
  test('staff see their own assigned requests and unassigned requests, but not another staff member’s work', async () => {
    const requester = await makeUser('requester');
    const firstStaff = await makeUser('staff');
    const secondStaff = await makeUser('staff');
    const own = await submitRequest(requester);
    const other = await submitRequest(requester, validBody({ title: 'Broken park swing' }));
    const unassigned = await submitRequest(requester, validBody({ title: 'Unassigned street sign' }));
    await api().post(`/api/requests/${own.id}/assign`).set(firstStaff.auth).send({});
    await api().post(`/api/requests/${other.id}/assign`).set(secondStaff.auth).send({});

    const firstQueue = await api().get('/api/requests').set(firstStaff.auth);
    expect(firstQueue.body.total).toBe(2);
    expect(firstQueue.body.items.map((item) => item.id)).toContain(own.id);
    expect(firstQueue.body.items.map((item) => item.id)).toContain(unassigned.id);
    expect(firstQueue.body.items.map((item) => item.id)).not.toContain(other.id);
  });

  test('staff can accept an unassigned request and the responsible person is saved', async () => {
    const requester = await makeUser('requester');
    const staff = await makeUser('staff');
    const request = await submitRequest(requester);
    const result = await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({});

    expect(result.status).toBe(200);
    expect(result.body.request.status).toBe('assigned');
    expect(result.body.request.assignee.name).toBe(staff.user.name);
  });

  test('management can assign only to staff; requester cannot assign', async () => {
    const requester = await makeUser('requester');
    const staff = await makeUser('staff');
    const manager = await makeUser('management');
    const request = await submitRequest(requester);

    const invalid = await api()
      .post(`/api/requests/${request.id}/assign`)
      .set(manager.auth)
      .send({ assigneeId: requester.user.id });
    expect(invalid.status).toBe(400);
    expect((await api().post(`/api/requests/${request.id}/assign`).set(requester.auth).send({})).status).toBe(403);
    expect((await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({})).status).toBe(200);
  });
});

describe('FR-005 controlled status transitions', () => {
  test('an invalid transition is rejected without a status or audit change', async () => {
    const requester = await makeUser('requester');
    const staff = await makeUser('staff');
    const request = await submitRequest(requester);
    await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({});
    const invalid = await setStatus(request.id, staff, 'closed');

    expect(invalid.status).toBe(409);
    const after = await api().get(`/api/requests/${request.id}`).set(staff.auth);
    expect(after.body.request.status).toBe('assigned');
    expect(after.body.request.statusHistory).toHaveLength(1);
  });

  test('requesters cannot change status; staff can follow the permitted lifecycle', async () => {
    const requester = await makeUser('requester');
    const staff = await makeUser('staff');
    const request = await submitRequest(requester);

    expect((await setStatus(request.id, requester, 'assigned')).status).toBe(403);
    expect((await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({})).status).toBe(200);
    expect((await setStatus(request.id, staff, 'in_progress')).status).toBe(200);

    const resolved = await setStatus(request.id, staff, 'resolved', { comment: 'Pothole filled' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.request.status).toBe('resolved');
    expect(resolved.body.request.statusHistory.at(-1).comment).toBe('Pothole filled');
    expect((await setStatus(request.id, staff, 'closed')).status).toBe(200);
  });

  test('management is read-only for status transitions', async () => {
    const requester = await makeUser('requester');
    const manager = await makeUser('management');
    const request = await submitRequest(requester);

    expect((await setStatus(request.id, manager, 'rejected')).status).toBe(403);
  });
});

describe('FR-006 staff comments and action notes', () => {
  test('staff comments are saved with author and time; requesters cannot comment', async () => {
    const requester = await makeUser('requester');
    const staff = await makeUser('staff');
    const request = await submitRequest(requester);
    await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({});

    const result = await api()
      .post(`/api/requests/${request.id}/comments`)
      .set(staff.auth)
      .send({ body: 'Crew booked for Friday' });
    expect(result.status).toBe(201);
    expect(result.body.request.comments[0].body).toBe('Crew booked for Friday');
    expect(result.body.request.comments[0].author.name).toBe(staff.user.name);
    expect(result.body.request.comments[0].createdAt).toBeTruthy();
    expect((await api().post(`/api/requests/${request.id}/comments`).set(requester.auth).send({ body: 'Hello' })).status).toBe(403);
    expect((await api().post(`/api/requests/${request.id}/comments`).set(staff.auth).send({ body: '' })).status).toBe(400);
  });
});
