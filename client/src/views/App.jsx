import React, { useState } from 'react'
import { api } from '../models/api.js'
import { useCivicConnect } from '../controllers/useCivicConnect.js'

const categories = [
  ['roads', 'Roads and sidewalks'],
  ['water', 'Water and sanitation'],
  ['waste', 'Waste and cleaning'],
  ['street_lighting', 'Street lighting'],
  ['parks', 'Parks and public spaces'],
  ['other', 'Other'],
]

const transitionOptions = {
  submitted: [['rejected', 'Reject']],
  assigned: [['in_progress', 'Start work'], ['rejected', 'Reject']],
  in_progress: [['resolved', 'Mark resolved'], ['rejected', 'Reject']],
  resolved: [['closed', 'Close request']],
  closed: [],
  rejected: [],
}

export function App() {
  const controller = useCivicConnect()

  if (!controller.sessionLoaded) {
    return <main className="loading-screen" aria-live="polite">Loading Civic Connect...</main>
  }

  if (!controller.user) {
    return <AuthScreen controller={controller} />
  }

  return <Dashboard controller={controller} />
}

function SiteHeader({ user, onSignOut }) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Civic Connect home">
        <span className="brand__mark" aria-hidden="true">C</span>
        <span>Civic Connect</span>
      </a>
      {user && (
        <div className="account-tools">
          <span className="role-badge">{roleName(user.role)}</span>
          <span className="account-name">{user.name}</span>
          <button className="button button--quiet" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}

function AuthScreen({ controller }) {
  const [isRegistering, setIsRegistering] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    await controller.signIn(data, isRegistering)
  }

  return (
    <div className="app-shell">
      <SiteHeader user={null} />
      <main className="auth-layout">
        <section className="welcome-panel">
          <p className="eyebrow">Local voices. Real change.</p>
          <h1>Make your neighborhood better.</h1>
          <p>
            Submit a community service request, follow its progress, and help
            your local team respond.
          </p>
          <div className="welcome-note">
            <span aria-hidden="true">✓</span>
            One clear place to submit and track local requests.
          </div>
        </section>
        <section className="panel auth-panel" aria-labelledby="auth-heading">
          <p className="eyebrow">{isRegistering ? 'Get started' : 'Welcome back'}</p>
          <h2 id="auth-heading">{isRegistering ? 'Create your account' : 'Sign in'}</h2>
          <StatusMessage controller={controller} />
          <form onSubmit={submit} className="form-stack">
            {isRegistering && (
              <Field id="auth-name" label="Full name" name="name" autoComplete="name" required maxLength={100} />
            )}
            <Field id="auth-email" label="Email address" name="email" type="email" autoComplete="email" required maxLength={254} />
            <Field
              id="auth-password"
              label="Password"
              name="password"
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              minLength={isRegistering ? 12 : undefined}
              maxLength={isRegistering ? 72 : undefined}
              required
            />
            {isRegistering && <p className="field-help">Use at least 12 characters (maximum 72 UTF-8 bytes).</p>}
            <button className="button" type="submit">
              {isRegistering ? 'Create requester account' : 'Sign in'}
            </button>
          </form>
          <p className="auth-switch">
            {isRegistering ? 'Already registered?' : 'New to Civic Connect?'}{' '}
            <button
              className="text-button"
              type="button"
              onClick={() => {
                controller.setError('')
                setIsRegistering((value) => !value)
              }}
            >
              {isRegistering ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <p className="auth-help">Staff accounts are provisioned by the system administrator.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function Dashboard({ controller }) {
  const { user, requests, summary, staff, statusFilter, setStatusFilter, loading } = controller

  return (
    <div className="app-shell">
      <SiteHeader user={user} onSignOut={controller.signOut} />
      <main className="dashboard">
        <section className="dashboard-intro">
          <div>
            <p className="eyebrow">{roleName(user.role)} workspace</p>
            <h1>{greeting(user.role)}</h1>
            <p className="intro-copy">{workspaceDescription(user.role)}</p>
          </div>
        </section>
        <StatusMessage controller={controller} />
        {user.role === 'management' && <ManagementSummary summary={summary} />}
        <div className={`workspace workspace--${user.role}`}>
          {user.role === 'requester' && <RequestForm controller={controller} />}
          <section className="request-workspace" aria-labelledby="requests-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{user.role === 'requester' ? 'Your activity' : 'Service desk'}</p>
                <h2 id="requests-heading">
                  {user.role === 'requester' ? 'Your requests' : 'Service requests'}
                </h2>
              </div>
              <div className="filter-controls">
                <label className="filter-control">
                  <span className="sr-only">Filter by status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value)
                      controller.setPage(1)
                    }}
                  >
                    <option value="open">Open</option>
                    {user.role === 'management' && <option value="overdue">Overdue</option>}
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="all">All statuses</option>
                  </select>
                </label>
                <label className="filter-control">
                  <span className="sr-only">Filter by category</span>
                  <select
                    value={controller.categoryFilter}
                    onChange={(event) => {
                      controller.setCategoryFilter(event.target.value)
                      controller.setPage(1)
                    }}
                  >
                    <option value="">All categories</option>
                    {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {user.role !== 'requester' && (
              <label className="search-control">
                <span className="sr-only">Search requests</span>
                <input
                  type="search"
                  placeholder="Search title, details or location"
                  value={controller.search}
                  onChange={(event) => {
                    controller.setSearch(event.target.value)
                    controller.setPage(1)
                  }}
                />
              </label>
            )}
            <RequestList
              requests={requests}
              loading={loading}
              selectedId={controller.selectedRequest?.id}
              onSelect={controller.setSelectedRequest}
              page={controller.page}
              pagination={controller.pagination}
              onPageChange={controller.setPage}
            />
          </section>
          {controller.selectedRequest && (
            <RequestDetails
              request={controller.selectedRequest}
              user={user}
              staff={staff}
              onClose={() => controller.setSelectedRequest(null)}
              runAction={controller.runAction}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function ManagementSummary({ summary }) {
  const values = summary || { open: '—', overdue: '—', resolved: '—', closed: '—' }
  return (
    <>
      <section className="summary-grid" aria-label="Request overview">
        <SummaryCard label="Open" value={values.open} />
        <SummaryCard label="Overdue" value={values.overdue} tone="warning" />
        <SummaryCard label="Resolved" value={values.resolved} tone="success" />
        <SummaryCard label="Closed" value={values.closed} />
      </section>
      {summary?.byCategory?.length > 0 && (
        <section className="category-summary" aria-labelledby="category-summary-heading">
          <h2 id="category-summary-heading">Requests by category</h2>
          <div className="category-summary__list">
            {summary.byCategory.map((item) => (
              <div className="category-summary__row" key={item._id}>
                <span>{categoryName(item._id)}</span>
                <span>{item.total} total · {item.open} open · {item.overdue} overdue</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function SummaryCard({ label, value, tone = '' }) {
  return (
    <article className={`summary-card${tone ? ` summary-card--${tone}` : ''}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}

function RequestForm({ controller }) {
  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    await controller.runAction(async () => {
      await api.createRequest(data)
      form.reset()
    }, 'Your request has been submitted.')
  }

  return (
    <section className="panel request-form-panel" aria-labelledby="new-request-heading">
      <p className="eyebrow">Have your say</p>
      <h2 id="new-request-heading">Submit a service request</h2>
      <form onSubmit={submit} className="form-stack">
        <Field id="request-title" label="Request title" name="title" placeholder="e.g. Broken streetlight" required maxLength={120} />
        <label htmlFor="request-category">Category</label>
        <select id="request-category" name="category" required defaultValue="">
          <option value="" disabled>Select a category</option>
          {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <Field id="request-location" label="Location" name="location" placeholder="Street, area, or landmark" required maxLength={200} />
        <label htmlFor="request-priority">Priority</label>
        <select id="request-priority" name="priority" defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <label htmlFor="request-description">Describe the issue</label>
        <textarea
          id="request-description"
          name="description"
          rows="4"
          maxLength={2000}
          placeholder="Include details that will help the service team respond."
          required
        />
        <button className="button" type="submit">Submit request</button>
      </form>
    </section>
  )
}

function RequestList({ requests, loading, selectedId, onSelect, page, pagination, onPageChange }) {
  if (loading && requests.length === 0) {
    return <p className="empty-state" role="status">Loading requests...</p>
  }
  if (!requests.length) {
    return <p className="empty-state">No requests match this view.</p>
  }

  const pageCount = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  return (
    <>
      <div className="request-list">
        {requests.map((request) => (
          <button
            type="button"
            className={`request-row${selectedId === request.id ? ' request-row--selected' : ''}`}
            key={request.id}
            onClick={() => onSelect(request)}
          >
            <span className="request-row__main">
              <span className="request-row__title">{request.title}</span>
              <span className="request-row__meta">
                {categoryName(request.category)} · {request.location}
              </span>
            </span>
            <span className="request-row__aside">
              <StatusBadge status={request.status} />
              <span className={`priority priority--${request.priority}`}>{request.priority}</span>
            </span>
          </button>
        ))}
      </div>
      {pagination.total > pagination.pageSize && (
        <nav className="pagination" aria-label="Request list pages">
          <button type="button" className="button button--quiet" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span>Page {page} of {pageCount}</span>
          <button type="button" className="button button--quiet" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
            Next
          </button>
        </nav>
      )}
    </>
  )
}

function RequestDetails({ request, user, staff, onClose, runAction }) {
  const [assigneeId, setAssigneeId] = useState('')
  const [comment, setComment] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [dueAt, setDueAt] = useState(request.dueAt ? toLocalDateTime(request.dueAt) : '')
  const choices = transitionOptions[request.status] || []
  const canManage = user.role === 'management' || request.assignee?.id === user.id
  const canAssign = user.role === 'management' || (
    user.role === 'staff' && request.status === 'submitted' && !request.assignee
  )

  async function assign(event) {
    event.preventDefault()
    await runAction(
      () => api.assignRequest(request.id, user.role === 'management' ? { assigneeId } : {}),
      'Request assignment saved.'
    )
  }

  async function changeStatus(event) {
    event.preventDefault()
    if (!nextStatus) return
    await runAction(
      () => api.changeStatus(request.id, { status: nextStatus, comment }),
      'Request status updated.'
    )
    setComment('')
    setNextStatus('')
  }

  async function addComment(event) {
    event.preventDefault()
    if (!comment.trim()) return
    await runAction(
      () => api.addComment(request.id, { body: comment }),
      'Activity note added.'
    )
    setComment('')
  }

  async function saveDueDate(event) {
    event.preventDefault()
    await runAction(
      () => api.setDueDate(request.id, { dueAt: dueAt ? new Date(dueAt).toISOString() : null }),
      'Due date saved.'
    )
  }

  return (
    <aside className="panel request-detail" aria-labelledby="detail-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Request details</p>
          <h2 id="detail-heading">{request.title}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close request details">×</button>
      </div>
      <div className="detail-status">
        <StatusBadge status={request.status} />
        <span className={`priority priority--${request.priority}`}>{request.priority} priority</span>
      </div>
      <dl className="detail-facts">
        <div><dt>Category</dt><dd>{categoryName(request.category)}</dd></div>
        <div><dt>Location</dt><dd>{request.location}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(request.createdAt)}</dd></div>
        <div><dt>Requester</dt><dd>{request.requester?.name || 'Requester'}</dd></div>
        <div><dt>Assigned to</dt><dd>{request.assignee?.name || 'Not assigned'}</dd></div>
        {request.dueAt && <div><dt>Due date</dt><dd>{formatDate(request.dueAt)}</dd></div>}
      </dl>
      <section className="detail-section">
        <h3>Description</h3>
        <p className="detail-description">{request.description}</p>
      </section>
      <section className="detail-section">
        <h3>Status history</h3>
        <ol className="history-list">
          <li><span>Submitted</span><time>{formatDate(request.createdAt)}</time></li>
          {request.statusHistory.map((entry, index) => (
            <li key={`${entry.changedAt}-${index}`}>
              <span>{statusName(entry.status || entry.toStatus)}</span>
              <time>{formatDate(entry.changedAt)}</time>
              {!['requester'].includes(user.role) && entry.comment && <p>{entry.comment}</p>}
            </li>
          ))}
        </ol>
      </section>
      {user.role !== 'requester' && request.comments?.length > 0 && (
        <section className="detail-section">
          <h3>Staff activity</h3>
          <ul className="comment-list">
            {request.comments.map((item) => (
              <li key={item.id}>
                <p>{item.body}</p>
                <span>{item.author?.name || 'Staff'} · {formatDate(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {canAssign && (
        <section className="detail-section">
          <h3>Assignment</h3>
          <form className="inline-form" onSubmit={assign}>
            {user.role === 'management' ? (
              <label className="sr-only" htmlFor="assignee">Assign to staff member</label>
            ) : null}
            {user.role === 'management' && (
              <select id="assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} required>
                <option value="">Choose staff member</option>
                {staff.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
              </select>
            )}
            <button className="button button--small" type="submit">
              {user.role === 'management' ? 'Assign request' : 'Accept request'}
            </button>
          </form>
        </section>
      )}
      {canManage && (
        <>
          <section className="detail-section">
            <h3>Set due date</h3>
            <form className="inline-form" onSubmit={saveDueDate}>
              <label className="sr-only" htmlFor="due-date">Due date</label>
              <input id="due-date" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
              <button className="button button--small" type="submit">Save date</button>
            </form>
          </section>
          {choices.length > 0 && (
            <section className="detail-section">
              <h3>Update status</h3>
              <form className="form-stack" onSubmit={changeStatus}>
                <label htmlFor="next-status">Next status</label>
                <select id="next-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} required>
                  <option value="">Choose a status</option>
                  {choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label htmlFor="status-note">Optional note</label>
                <textarea id="status-note" rows="2" maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} />
                <button className="button button--small" type="submit" disabled={!nextStatus}>Update status</button>
              </form>
            </section>
          )}
          <section className="detail-section">
            <h3>Add staff activity note</h3>
            <form className="form-stack" onSubmit={addComment}>
              <label htmlFor="staff-comment">Note</label>
              <textarea id="staff-comment" rows="3" maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} required />
              <button className="button button--small" type="submit" disabled={!comment.trim()}>Save note</button>
            </form>
          </section>
        </>
      )}
    </aside>
  )
}

function StatusBadge({ status }) {
  return <span className={`status status--${status}`}>{statusName(status)}</span>
}

function Field({ id, label, name, type = 'text', ...props }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} {...props} />
    </>
  )
}

function StatusMessage({ controller }) {
  return (
    <>
      {controller.error && <p className="alert alert--error" role="alert">{controller.error}</p>}
      {controller.notice && <p className="alert alert--success" role="status">{controller.notice}</p>}
    </>
  )
}

function SiteFooter() {
  return <footer className="site-footer">Civic Connect · Better communities start together.</footer>
}

function roleName(role) {
  return { requester: 'Requester', staff: 'Staff', management: 'Management' }[role] || role
}

function greeting(role) {
  return {
    requester: 'Your community requests',
    staff: 'Your service queue',
    management: 'Community service overview',
  }[role]
}

function workspaceDescription(role) {
  return {
    requester: 'Submit an issue and follow its progress through the service team.',
    staff: 'Review unassigned requests, take ownership, and record work as it progresses.',
    management: 'Monitor outstanding work, overdue requests, and completed service requests.',
  }[role]
}

function statusName(status = '') {
  return status.replaceAll('_', ' ')
}

function categoryName(category) {
  return categories.find(([value]) => value === category)?.[1] || category
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function toLocalDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
