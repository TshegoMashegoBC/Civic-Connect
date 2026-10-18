const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server/src/app');
const { createAuthService } = require('../server/src/services/authService');
const { createRequestService } = require('../server/src/services/requestService');
const { createMemoryRepositories } = require('./support/memoryRepositories');

const secret = 'test-only-jwt-secret-that-is-at-least-32-characters';
const staffPassword = 'staff-password-used-only-for-tests';
const managementPassword = 'manager-password-used-only-for-tests';

async function startTestServer() {
  const repositories = createMemoryRepositories();
  const authService = createAuthService({
    userRepository: repositories.userRepository,
    jwtSecret: secret,
  });
  const staff = await authService.register({
    name: 'Support Staff',
    email: 'staff@example.test',
    password: staffPassword,
  });
  repositories.users.get(staff.user.id).role = 'staff';
  const manager = await authService.register({
    name: 'Service Manager',
    email: 'manager@example.test',
    password: managementPassword,
  });
  repositories.users.get(manager.user.id).role = 'management';
  const app = createApp({
    userRepository: repositories.userRepository,
    requestService: createRequestService({
      requestRepository: repositories.requestRepository,
      userRepository: repositories.userRepository,
    }),
    authService,
    jwtSecret: secret,
    clientOrigin: 'http://localhost:5173',
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  async function call(path, { cookie, ...options } = {}) {
    const headers = new Headers(options.headers);
    if (cookie) headers.set('Cookie', cookie);
    if (options.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const data = response.status === 204 ? null : await response.json();
    return { response, data, cookie: sessionCookie(response) };
  }

  async function login(email, password) {
    const result = await call('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert.equal(result.response.status, 200);
    return result.cookie;
  }

  return {
    ...repositories,
    call,
    login,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

function sessionCookie(response) {
  const header = response.headers.get('set-cookie') || '';
  return header.match(/civic_connect_session=[^;]+/)?.[0];
}

test('requester registration, protected submission, staff workflow and management summary', async (t) => {
  const api = await startTestServer();
  t.after(() => api.close());

  const registered = await api.call('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Community Member',
      email: 'member@example.test',
      password: 'long-enough-test-password',
      role: 'management',
    }),
  });
  assert.equal(registered.response.status, 201);
  assert.equal(registered.data.user.role, 'requester');
  assert.match(registered.response.headers.get('set-cookie'), /HttpOnly/i);

  const denied = await api.call('/requests');
  assert.equal(denied.response.status, 401);

  const submitted = await api.call('/requests', {
    method: 'POST',
    cookie: registered.cookie,
    body: JSON.stringify({
      title: 'Blocked drain',
      description: 'Water is pooling at the crossing.',
      category: 'water',
      location: 'Market Square',
      requester: 'somebody-else',
    }),
  });
  assert.equal(submitted.response.status, 201);
  assert.equal(submitted.data.request.status, 'submitted');
  const id = submitted.data.request.id;

  const staffCookie = await api.login('staff@example.test', staffPassword);
  const accepted = await api.call(`/requests/${id}/assign`, {
    method: 'POST',
    cookie: staffCookie,
    body: JSON.stringify({}),
  });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.data.request.status, 'assigned');

  for (const status of ['in_progress', 'resolved', 'closed']) {
    const result = await api.call(`/requests/${id}/status`, {
      method: 'PATCH',
      cookie: staffCookie,
      body: JSON.stringify({ status }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.data.request.status, status);
  }

  const managerCookie = await api.login('manager@example.test', managementPassword);
  const result = await api.call('/requests/summary', { cookie: managerCookie });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.data.summary, {
    open: 0,
    overdue: 0,
    resolved: 0,
    closed: 1,
    byCategory: [{ _id: 'water', total: 1, open: 0, overdue: 0 }],
  });

  const requesterDetail = await api.call(`/requests/${id}`, { cookie: registered.cookie });
  assert.equal(requesterDetail.response.status, 200);
  assert.equal(requesterDetail.data.request.status, 'closed');
  assert.equal(requesterDetail.data.request.statusHistory.length, 4);
  assert.equal(requesterDetail.data.request.comments, undefined);
});

test('requester cannot access management reporting or perform staff actions', async (t) => {
  const api = await startTestServer();
  t.after(() => api.close());

  const registered = await api.call('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Requester',
      email: 'requester@example.test',
      password: 'long-enough-test-password',
    }),
  });

  const summary = await api.call('/requests/summary', { cookie: registered.cookie });
  assert.equal(summary.response.status, 403);
  const update = await api.call('/requests/request-1/status', {
    method: 'PATCH',
    cookie: registered.cookie,
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.equal(update.response.status, 403);
});

test('untrusted browser origins cannot perform cookie-authenticated changes', async (t) => {
  const api = await startTestServer();
  t.after(() => api.close());

  const registered = await api.call('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Requester',
      email: 'origin@example.test',
      password: 'long-enough-test-password',
    }),
  });

  const response = await api.call('/requests', {
    method: 'POST',
    cookie: registered.cookie,
    headers: { Origin: 'https://untrusted.example' },
    body: JSON.stringify({
      title: 'Broken sign',
      description: 'The sign has fallen.',
      category: 'other',
      location: 'Town centre',
    }),
  });
  assert.equal(response.response.status, 403);
});
