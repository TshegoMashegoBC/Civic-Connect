// NFR-004: status and audit history are updated atomically on each request document.
const db = require('../helpers/db');
const {
  api,
  makeUser,
  submitRequest,
  setStatus,
  ServiceRequest,
  requestRepository,
} = require('../helpers/factory');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);
afterEach(() => jest.restoreAllMocks());

test('five status transitions produce five complete audit entries', async () => {
  const requester = await makeUser('requester');
  const staff = await makeUser('staff');
  const first = await submitRequest(requester);
  const second = await submitRequest(requester);

  await api().post(`/api/requests/${first.id}/assign`).set(staff.auth).send({});
  await setStatus(first.id, staff, 'in_progress');
  await setStatus(first.id, staff, 'resolved', { comment: 'Repaired' });
  await setStatus(first.id, staff, 'closed');
  await api().post(`/api/requests/${second.id}/assign`).set(staff.auth).send({});
  await setStatus(second.id, staff, 'rejected');

  const documents = await ServiceRequest.find({});
  const entries = documents.flatMap((document) => document.statusHistory);
  expect(entries).toHaveLength(6);
  for (const entry of entries) {
    expect(entry.changedAt).toBeInstanceOf(Date);
    expect(entry.changedBy).toBeTruthy();
    expect(entry.fromStatus).toBeTruthy();
    expect(entry.toStatus).toBeTruthy();
    expect(entry.fromStatus).not.toBe(entry.toStatus);
  }
  expect(entries.every((entry) => String(entry.changedBy) === String(staff.user._id))).toBe(true);
});

test('a failed atomic write leaves both request status and audit history unchanged', async () => {
  const requester = await makeUser('requester');
  const staff = await makeUser('staff');
  const request = await submitRequest(requester);

  jest.spyOn(requestRepository(), 'updateIf').mockRejectedValueOnce(new Error('simulated write failure'));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const response = await api().post(`/api/requests/${request.id}/assign`).set(staff.auth).send({});
  expect(response.status).toBe(500);

  const unchanged = await ServiceRequest.findById(request.id);
  expect(unchanged.status).toBe('submitted');
  expect(unchanged.statusHistory).toHaveLength(0);
  expect(unchanged.assignee).toBeNull();
});

test('concurrent assignment updates permit one writer and keep one audit entry', async () => {
  const requester = await makeUser('requester');
  const firstStaff = await makeUser('staff');
  const secondStaff = await makeUser('staff');
  const request = await submitRequest(requester);

  const responses = await Promise.all([
    api().post(`/api/requests/${request.id}/assign`).set(firstStaff.auth).send({}),
    api().post(`/api/requests/${request.id}/assign`).set(secondStaff.auth).send({}),
  ]);
  expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);

  const saved = await ServiceRequest.findById(request.id);
  expect(saved.statusHistory.filter((entry) => entry.toStatus === 'assigned')).toHaveLength(1);
});
