const db = require('../helpers/db');
const { api, makeUser, validBody } = require('../helpers/factory');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

describe('authentication and role-based access control (SE-004)', () => {
  test('registration creates a requester with a secure session cookie', async () => {
    const response = await api()
      .post('/api/auth/register')
      .send({ name: 'Ayanda', email: 'A@Test.com', password: 'Password123!' });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('requester');
    expect(response.body.user.email).toBe('a@test.com');
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  test('role supplied during registration cannot promote the account', async () => {
    const response = await api()
      .post('/api/auth/register')
      .send({
        name: 'Eve',
        email: 'eve@test.com',
        password: 'Password123!',
        role: 'management',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('requester');
  });

  test('weak passwords and duplicate email addresses are rejected', async () => {
    const weak = await api()
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@b.co', password: 'short' });
    expect(weak.status).toBe(400);

    await makeUser('requester', { email: 'dup@test.com' });
    const duplicate = await api()
      .post('/api/auth/register')
      .send({ name: 'A', email: 'dup@test.com', password: 'Password123!' });
    expect(duplicate.status).toBe(409);
  });

  test('login sets an HttpOnly session and rejects an incorrect password', async () => {
    await makeUser('staff', { email: 'staff@test.com' });
    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'staff@test.com', password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie'][0]).toMatch(/HttpOnly/i);

    const invalid = await api()
      .post('/api/auth/login')
      .send({ email: 'staff@test.com', password: 'incorrect password' });
    expect(invalid.status).toBe(401);
  });

  test('protected APIs require a session and enforce roles', async () => {
    expect((await api().get('/api/requests')).status).toBe(401);
    expect((await api().get('/api/requests').set('Authorization', 'Bearer invalid')).status).toBe(401);

    const staff = await makeUser('staff');
    expect((await api().post('/api/requests').set(staff.auth).send(validBody())).status).toBe(403);

    const requester = await makeUser('requester');
    expect((await api().get('/api/requests/summary').set(requester.auth)).status).toBe(403);
    expect((await api().get('/api/staff').set(requester.auth)).status).toBe(403);
  });
});

describe('health readiness (NFR-005)', () => {
  test('reports an unavailable database to the readiness probe', async () => {
    const response = await api().get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'unavailable', db: 'disconnected' });
    expect(response.body.release).toBeDefined();
  });
});
