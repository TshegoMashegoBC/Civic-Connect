const request = require('supertest');
const { hashPassword } = require('../../server/src/security/password');
const db = require('./db');

const api = () => request(db.getContext().app);
let n = 0;

async function makeUser(role = 'requester', overrides = {}) {
  n += 1;
  const user = await db.getContext().userRepository.create({
    name: `${role} ${n}`,
    email: `${role}${n}@test.local`,
    passwordHash: await hashPassword('Password123!', 4),
    role,
    ...overrides,
  });
  const login = await api()
    .post('/api/auth/login')
    .send({ email: user.email, password: 'Password123!' });
  const cookieHeader = login.headers['set-cookie']?.[0] || '';
  const cookie = cookieHeader.match(/civic_connect_session=[^;]+/)?.[0];
  if (login.status !== 200 || !cookie) {
    throw new Error(`Could not create a test session (HTTP ${login.status}).`);
  }
  return { user: { ...user, id: String(user._id) }, auth: { Cookie: cookie } };
}

const validBody = (o = {}) => ({
  title: 'Pothole on Main Road',
  description: 'Large pothole near the school entrance, damaging cars.',
  category: 'roads',
  location: 'Main Road',
  priority: 'high',
  ...o,
});

async function submitRequest(requester, body = validBody()) {
  const res = await api().post('/api/requests').set(requester.auth).send(body);
  return res.body.request;
}

const setStatus = (id, staff, status, extra = {}) =>
  api().patch(`/api/requests/${id}/status`).set(staff.auth).send({ status, ...extra });

const ServiceRequest = {
  find: async () => [...db.getContext().requests.values()],
  findById: async (id) => db.getContext().requests.get(String(id)) || null,
  updateOne: async (filter, update) => {
    const saved = db.getContext().requests.get(String(filter._id));
    if (!saved) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(saved, update.$set || update);
    return { matchedCount: 1, modifiedCount: 1 };
  },
};

module.exports = {
  api,
  makeUser,
  validBody,
  submitRequest,
  setStatus,
  ServiceRequest,
  requestRepository: () => db.getContext().requestRepository,
};
