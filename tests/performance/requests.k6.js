import http from 'k6/http';
import { check, fail } from 'k6';

const api = (__ENV.API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['avg<3000', 'max<5000'],
  },
};

function login(email, password) {
  if (!email || !password) fail('Set requester, staff and management test credentials.');
  const response = http.post(
    `${api}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (!check(response, { 'test account can sign in': (result) => result.status === 200 })) {
    fail(`Could not authenticate load-test account (${response.status}).`);
  }

  const cookie = response.headers['Set-Cookie'] || response.headers['set-cookie'] || '';
  const session = cookie.match(/civic_connect_session=[^;]+/)?.[0];
  if (!session) fail('The authentication response did not set the session cookie.');
  return session;
}

export function setup() {
  return {
    requester: login(__ENV.REQUESTER_EMAIL, __ENV.REQUESTER_PASSWORD),
    staff: login(__ENV.STAFF_EMAIL, __ENV.STAFF_PASSWORD),
    management: login(__ENV.MANAGEMENT_EMAIL, __ENV.MANAGEMENT_PASSWORD),
  };
}

export default function (sessions) {
  const headers = (cookie, mutation = false) => ({
    Cookie: cookie,
    ...(mutation ? { Origin: __ENV.CLIENT_ORIGIN || 'http://localhost:5173' } : {}),
  });

  const list = http.get(`${api}/requests?status=open`, {
    headers: headers(sessions.requester),
  });
  check(list, { 'request list responds successfully': (response) => response.status === 200 });

  const created = http.post(
    `${api}/requests`,
    JSON.stringify({
      title: `Load test issue ${__VU}-${__ITER}`,
      description: 'Automated performance test request.',
      category: 'other',
      location: 'Performance test area',
      priority: 'low',
    }),
    {
      headers: {
        ...headers(sessions.requester, true),
        'Content-Type': 'application/json',
      },
    }
  );
  if (!check(created, { 'request submission succeeds': (response) => response.status === 201 })) return;

  const requestId = created.json('request.id');
  const assigned = http.post(
    `${api}/requests/${requestId}/assign`,
    '{}',
    {
      headers: {
        ...headers(sessions.staff, true),
        'Content-Type': 'application/json',
      },
    }
  );
  if (!check(assigned, { 'staff can accept a request': (response) => response.status === 200 })) return;

  const updated = http.patch(
    `${api}/requests/${requestId}/status`,
    JSON.stringify({ status: 'in_progress' }),
    {
      headers: {
        ...headers(sessions.staff, true),
        'Content-Type': 'application/json',
      },
    }
  );
  check(updated, { 'staff can progress a request': (response) => response.status === 200 });

  const summary = http.get(`${api}/requests/summary`, {
    headers: headers(sessions.management),
  });
  check(summary, { 'management summary responds successfully': (response) => response.status === 200 });
}
