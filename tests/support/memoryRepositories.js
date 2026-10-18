function createMemoryRepositories() {
  const users = new Map()
  const requests = new Map()
  let nextUserId = 1
  let nextRequestId = 1

  const userRepository = {
    async findByEmail(email) {
      return [...users.values()].find((user) => user.email === email) || null
    },
    async create(data) {
      const user = {
        ...data,
        _id: data._id || `user-${nextUserId++}`,
        createdAt: data.createdAt || new Date(),
      }
      users.set(String(user._id), user)
      return user
    },
    async findStaffById(id) {
      const user = users.get(String(id))
      return user?.role === 'staff' ? user : null
    },
    async listStaff() {
      return [...users.values()]
        .filter((user) => user.role === 'staff')
        .map(({ _id, name }) => ({ _id, name }))
    },
  }

  const requestRepository = {
    async create(data) {
      const now = new Date()
      const request = {
        ...data,
        _id: `request-${nextRequestId++}`,
        createdAt: now,
        updatedAt: now,
      }
      requests.set(String(request._id), request)
      return hydrate(request, users)
    },
    async findById(id) {
      const request = requests.get(String(id))
      return request ? hydrate(request, users) : null
    },
    async findMany(filter, { page, pageSize }) {
      const items = [...requests.values()]
        .filter((request) => matches(request, filter))
        .sort((left, right) => right.createdAt - left.createdAt)
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize)
          .map((request) => hydrate(request, users)),
        total: items.length,
      }
    },
    async updateIf(id, condition, update) {
      const request = requests.get(String(id))
      if (!request || !matches(request, condition)) return null
      for (const [key, value] of Object.entries(update.$set || {})) request[key] = value
      for (const [key, value] of Object.entries(update.$push || {})) {
        request[key] ||= []
        request[key].push(value)
      }
      request.updatedAt = new Date()
      return hydrate(request, users)
    },
    async count(filter) {
      return [...requests.values()].filter((request) => matches(request, filter)).length
    },
    async groupByCategory(openStatuses) {
      const groups = new Map()
      for (const request of requests.values()) {
        const group = groups.get(request.category) || {
          _id: request.category,
          total: 0,
          open: 0,
          overdue: 0,
        }
        group.total += 1
        if (openStatuses.includes(request.status)) {
          group.open += 1
          if (request.dueAt && request.dueAt < new Date()) group.overdue += 1
        }
        groups.set(request.category, group)
      }
      return [...groups.values()].sort((left, right) => left._id.localeCompare(right._id))
    },
  }

  return { userRepository, requestRepository, users, requests }
}

function hydrate(request, users) {
  const result = structuredClone(request)
  result.requester = populate(result.requester, users)
  result.assignee = populate(result.assignee, users)
  result.statusHistory = (result.statusHistory || []).map((entry) => ({
    ...entry,
    changedBy: populate(entry.changedBy, users),
  }))
  result.comments = (result.comments || []).map((comment) => ({
    ...comment,
    author: populate(comment.author, users),
  }))
  return result
}

function populate(value, users) {
  if (!value) return null
  const user = users.get(String(value?._id || value))
  return user
    ? { _id: user._id, name: user.name, role: user.role }
    : value
}

function matches(document, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$and') return expected.every((item) => matches(document, item))
    if (key === '$or') return expected.some((item) => matches(document, item))
    if (key === '$text') return true

    const actual = document[key]
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      return Object.entries(expected).every(([operator, value]) => {
        if (operator === '$in') return value.includes(String(actual?._id || actual)) || value.includes(actual)
        if (operator === '$ne') return compare(actual, value) !== 0
        if (operator === '$lt') return new Date(actual) < new Date(value)
        return false
      })
    }

    return compare(actual, expected) === 0
  })
}

function compare(left, right) {
  const leftValue = String(left?._id || left)
  const rightValue = String(right?._id || right)
  return leftValue === rightValue ? 0 : -1
}

module.exports = { createMemoryRepositories };
