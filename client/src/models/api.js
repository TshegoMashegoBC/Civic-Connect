const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
  .replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  const result = await response.json()
  if (!response.ok) {
    const error = new Error(result.message || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return result
}

function json(method, data) {
  return { method, body: JSON.stringify(data) }
}

export const api = {
  currentUser: () => request('/auth/me'),
  register: (data) => request('/auth/register', json('POST', data)),
  login: (data) => request('/auth/login', json('POST', data)),
  logout: () => request('/auth/logout', json('POST', {})),
  listRequests: (filters = {}) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value)
    }
    const query = params.size ? `?${params}` : ''
    return request(`/requests${query}`)
  },
  getRequest: (id) => request(`/requests/${encodeURIComponent(id)}`),
  createRequest: (data) => request('/requests', json('POST', data)),
  assignRequest: (id, data = {}) =>
    request(`/requests/${encodeURIComponent(id)}/assign`, json('POST', data)),
  changeStatus: (id, data) =>
    request(`/requests/${encodeURIComponent(id)}/status`, json('PATCH', data)),
  addComment: (id, data) =>
    request(`/requests/${encodeURIComponent(id)}/comments`, json('POST', data)),
  setDueDate: (id, data) =>
    request(`/requests/${encodeURIComponent(id)}/due-date`, json('PATCH', data)),
  summary: () => request('/requests/summary'),
  listStaff: () => request('/staff'),
}
