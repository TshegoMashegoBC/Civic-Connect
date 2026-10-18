# Civic Connect architecture decisions

## PED decision context

The PED selects a **modular monolith**: one principal application with clear
identity/access, request management, staff assignment, reporting and audit
boundaries. Its technology comparison's **Option 3** is Node.js
(NestJS/Express) with React/Next.js. The implementation uses Express and React
with Vite in one repository and keeps the backend as a modular monolith.

There is a conflict in the PED: the technology ADR (ADR-T01, page 22) still
records **Option 2 / ASP.NET Core + React + PostgreSQL**, while the comparison
table describes Option 3 separately. This implementation follows the team's
explicit selection of Option 3, not the stale ADR-T01 field values. React/Vite
is used instead of Next.js to retain the existing Vite client and provide the
separate SPA/API deployment described by the selected option.

## Data persistence ADR overview

The PED's data/persistence ADR, **ADR-D01 (pages 19–20)**, selects PostgreSQL.
Its reasoning is that requests, requesters, assignees, categories, comments and
status history have stable relationships; staff need indexed filtering and
management needs grouped counts; and status updates must be committed with an
audit entry. The ADR also identifies sensitivity of request details and free
database connection limits as important constraints.

The team has since selected **MongoDB**. This project therefore treats
ADR-D01's PostgreSQL decision as superseded, not as an implementation
requirement. The rationale and constraints remain relevant:

- Requesters and staff remain separate documents referenced by service
  requests; the application validates role and ownership before access.
- Status history and staff comments are embedded in the service-request
  document. A status transition uses one conditional MongoDB
  `findOneAndUpdate` to set the new status and append the audit record together.
  MongoDB's atomic single-document update means these two writes cannot be
  partially committed, including on a standalone local MongoDB server.
- Query indexes cover requester, assignee/status, due date, creation time and
  text search. Request lists are paginated and the MongoDB connection pool is
  bounded/configurable.
- This design avoids cross-collection transactions for status history, but it
  does not provide relational foreign-key enforcement. The API validates
  referenced staff and authorization in application logic. Reporting relies on
  indexed query/aggregation behavior rather than joins.
- MongoDB pool and hosted-tier connection limits still need to be measured
  against NFR-002; a local or in-memory test is not evidence of hosted
  50-user performance.

This is the implemented persistence choice; it is not a claim that the
PostgreSQL trade-offs in ADR-D01 no longer matter.

## PED design patterns

1. **Status transitions — Strategy.** `server/src/services/statusWorkflow.js`
   defines one rule per permitted source/destination pair, including roles and
   assignment validation. The request service invokes those rules before its
   atomic write.
2. **Notification channel — deferred.** The PED leaves this decision open and
   excludes SMS/push notifications. This implementation does not add an email
   service or other notification channel; requesters can sign in to see the
   controlled status history.
3. **Data access — repository boundary.** The request and user services use
   repository modules rather than importing MongoDB operations throughout
   controllers. Embedded audit data is committed within the request document;
   a relational Unit of Work/transaction is therefore not used.

## Requirement verification and remaining evidence

The implementation contains tests for requester isolation, RBAC, request
creation, staff assignment, valid and invalid status transitions, audit
history, comments, management status buckets, and concurrent assignments.
`tests/performance/requests.k6.js` defines a 50-VU/5-minute workload and checks
average and maximum HTTP duration. That load test has not been run against a
representative hosted database.

The following PED acceptance evidence still requires a deployed staging
environment or observation period and is **not claimed as passed**:

- **NFR-001:** Chrome/browser dashboard loading in under two seconds in at
  least 95% of 10 measurements. The k6 exercise measures API workflow latency,
  not browser rendering or full-page load.
- **NFR-002:** Run the k6 scenario with 50 concurrent users for five minutes
  against staging, record throughput/errors/average/maximum, and confirm
  response codes. Request creation correctly returns HTTP `201`; the PED's
  stated HTTP-200-only criterion should be clarified for create operations.
- **NFR-003:** A public HTTPS deployment, TLS 1.2+, and an SSL Labs A/A+ rating.
  Production mode redirects HTTP and sets secure cookies, but the application
  cannot establish a public server rating by itself.
- **NFR-005:** Uptime monitoring over the required two-week business-hours
  period. The API health endpoint is a readiness signal, not uptime evidence.
- **NFR-006:** Run axe DevTools or Lighthouse on each deployed screen and save
  the report. The client uses semantic headings, labels, keyboard focus
  indicators and live status messages; these choices do not replace the
  requested automated scan.

Operational risks to document at release include free-tier MongoDB connection
limits, different staging/production TLS and environment settings, and the
unmeasured long-duration availability target.
