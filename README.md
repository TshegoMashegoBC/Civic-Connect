# Civic Connect

Civic Connect is a web application for submitting and managing community
service requests. The implementation follows the PED's modular-monolith
direction with an Express API and a React client. MongoDB is the selected
persistence store; the project-specific decision and the original persistence
ADR are summarized in [the architecture decisions](docs/architecture/decisions.md).

## Requirements implemented

| PED requirement | Application behavior |
| --- | --- |
| FR-001 | Requesters register and submit categorized, located service requests. |
| FR-002 | Requesters see only their own requests and controlled status history. |
| FR-003 | Staff sign in to a queue containing unassigned and personally assigned requests. |
| FR-004 | Staff accept work; management can assign requests to staff. |
| FR-005 | Staff advance requests through validated states; status and audit history are written atomically. |
| FR-006 | Assigned staff record comments with the author and timestamp. |
| FR-007 | Management filters open, overdue, resolved and closed requests and sees counts by category. |
| NFR-001 / NFR-002 | Indexed and paginated queries, a bounded MongoDB connection pool, stateless sessions and a 50-user k6 scenario support performance testing. |
| NFR-003 / NFR-004 | Production HTTPS redirection, secure HttpOnly session cookies and append-only status history address transport security and auditability. |
| NFR-005 / NFR-006 | A database readiness endpoint and accessible semantic form controls support uptime monitoring and accessibility checks. |

Passing local tests does not establish the PED's hosted TLS rating, 99.5% uptime,
two-second browser load target, or 50-user performance threshold. See the
verification notes in [the architecture decisions](docs/architecture/decisions.md).

## Project structure

```text
client/
└── src/
    ├── controllers/       # Client state and user actions
    ├── models/            # API access
    ├── views/             # React screens
    └── main.jsx
server/
└── src/
    ├── controllers/
    ├── middleware/
    ├── models/            # MongoDB User and ServiceRequest schemas
    ├── repositories/      # MongoDB data access
    ├── routes/
    ├── scripts/
    ├── security/
    └── services/          # Auth, workflow rules and request operations
tests/
├── api/                   # MongoDB-backed API acceptance tests
├── unit/                  # Validation and workflow tests
├── performance/           # k6 50-user scenario
└── api.test.js            # HTTP-level tests using in-memory test repositories
```

## Setup

Requires Node.js 20.19+ (or 22.12+) and a MongoDB deployment. The in-memory
integration tests download a MongoDB binary on first use if one is not cached.

```powershell
npm install
npm --prefix client install
npm --prefix server install
Copy-Item server/.env.example server/.env
```

Update `server/.env`:

- `MONGODB_URI` — MongoDB connection string. Local MongoDB can use
  `mongodb://127.0.0.1:27017/civic-connect`; a replica set is not required for
  request status/audit atomicity because they are stored in the same document.
- `JWT_SECRET` — replace the example with a unique random value of at least 32
  characters; keep it out of source control.
- `CLIENT_ORIGIN` — exact browser origin for the React client (default
  `http://localhost:5173`).
- `COOKIE_SAME_SITE` — use `strict` locally. If client and API are hosted on
  different sites, configure `none` and HTTPS so cookies remain `Secure`.

Create the first staff account using environment variables in `server/.env`:

```text
BOOTSTRAP_STAFF_NAME=Support Staff
BOOTSTRAP_STAFF_EMAIL=staff@example.org
BOOTSTRAP_STAFF_PASSWORD=<unique password with at least 12 characters>
BOOTSTRAP_STAFF_ROLE=staff
```

Then run `npm run seed:staff`. Set the role to `management` when provisioning a
management account. Public sign-up can create requester accounts only.

## Run and test

```powershell
npm run dev
npm test
npm run build
```

The client runs at `http://localhost:5173` and the API at
`http://localhost:3000`. Set `VITE_API_URL` in `client/.env` if the API uses a
different origin. API readiness is reported at `GET /api/health`; it returns
`503` if MongoDB is disconnected.

Run the optional 50-user load exercise against a provisioned test database with
k6. Configure requester, staff and management test-account credentials in the
shell/environment; use a non-production database because the test submits
requests and advances their status:

```powershell
k6 run tests/performance/requests.k6.js
```

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/requests`, `POST /api/requests`
- `GET /api/requests/:id`
- `POST /api/requests/:id/assign`
- `PATCH /api/requests/:id/status`
- `POST /api/requests/:id/comments`
- `PATCH /api/requests/:id/due-date`
- `GET /api/requests/summary` (management)
- `GET /api/staff` (management)

Sessions use short-lived JWTs in HttpOnly cookies. The application does not
store requester-facing free-text staff notes in requester responses.
