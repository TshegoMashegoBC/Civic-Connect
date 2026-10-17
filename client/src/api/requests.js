const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/requests'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const message = await response.text()

  if (!response.ok) {
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return message
}

export function getRequests() {
  return request('/')
}

export function getRequest(id) {
  return request(`/${encodeURIComponent(id)}`)
}

export function createRequest(data) {
  return request('/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function updateRequest(id, data) {
  return request(`/posts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function deleteRequest(id) {
  return request(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
