const OPEN_STATUSES = ['submitted', 'assigned', 'in_progress'];
const ALL_STATUSES = [...OPEN_STATUSES, 'resolved', 'closed', 'rejected'];
const CATEGORIES = ['roads', 'water', 'waste', 'street_lighting', 'parks', 'other'];
const PRIORITIES = ['low', 'medium', 'high'];
const { validateTransition } = require('./statusWorkflow');

function createRequestService({ requestRepository, userRepository, clock = () => new Date() }) {
  async function create(user, input) {
    const data = validateNewRequest(input);
    const request = await requestRepository.create({
      ...data,
      requester: user.id,
      status: 'submitted',
      assignee: null,
      dueAt: null,
      statusHistory: [],
      comments: [],
    });
    return toResponse(request, user.role === 'requester');
  }

  async function list(user, query) {
    const page = parseInteger(query.page, 1, 1, 100000);
    const pageSize = parseInteger(query.pageSize, 20, 1, 100);
    const filters = [];

    if (user.role === 'requester') {
      filters.push({ requester: user.id });
    } else if (user.role === 'staff') {
      filters.push({
        $or: [
          { assignee: user.id },
          { assignee: null, status: 'submitted' },
        ],
      });
    }

    if (query.status) {
      const statusFilter = createStatusFilter(query.status, clock());
      if (!statusFilter) {
        throw httpError(400, 'Choose a valid request status filter.');
      }
      filters.push(statusFilter);
    }

    if (query.category) {
      if (!CATEGORIES.includes(query.category)) {
        throw httpError(400, 'Choose a valid request category.');
      }
      filters.push({ category: query.category });
    }

    if (query.search) {
      const search = query.search.trim().slice(0, 100);
      if (search) filters.push({ $text: { $search: search } });
    }

    const filter = filters.length > 1 ? { $and: filters } : filters[0] || {};
    const { items, total } = await requestRepository.findMany(filter, { page, pageSize });

    return {
      items: items.map((item) => toResponse(item, user.role === 'requester')),
      total,
      page,
      pageSize,
    };
  }

  async function getById(user, id) {
    const request = await findRequest(id);

    if (user.role === 'requester' && referenceId(request.requester) !== user.id) {
      throw httpError(404, 'Service request not found.');
    }

    if (
      user.role === 'staff' &&
      referenceId(request.assignee) !== user.id &&
      !(request.status === 'submitted' && !request.assignee)
    ) {
      throw httpError(404, 'Service request not found.');
    }

    return toResponse(request, user.role === 'requester');
  }

  async function assign(user, id, input = {}) {
    const request = await findRequest(id);
    let assigneeId;

    if (user.role === 'staff') {
      assigneeId = user.id;
      if (request.assignee || request.status !== 'submitted') {
        throw httpError(409, 'This request has already been assigned or is no longer available.');
      }
      validateTransition(request, 'assigned', user, { assigneeId });
    } else if (user.role === 'management') {
      assigneeId = input.assigneeId;
      if (!assigneeId) throw httpError(400, 'Select a staff member to assign.');
      if (!OPEN_STATUSES.includes(request.status)) {
        throw httpError(409, 'Only open requests can be assigned.');
      }
      const staffMember = await userRepository.findStaffById(assigneeId);
      if (!staffMember) throw httpError(400, 'Select an active staff account.');
      if (request.status === 'submitted') {
        validateTransition(request, 'assigned', user, { assigneeId });
      }
    } else {
      throw httpError(403, 'You do not have permission to assign requests.');
    }

    const isFirstAssignment = request.status === 'submitted';
    const update = {
      $set: {
        assignee: assigneeId,
        ...(isFirstAssignment ? { status: 'assigned' } : {}),
      },
    };

    if (isFirstAssignment) {
      update.$push = {
        statusHistory: {
          changedBy: user.id,
          fromStatus: 'submitted',
          toStatus: 'assigned',
          comment: '',
          changedAt: clock(),
        },
      };
    }

    const saved = await requestRepository.updateIf(
      id,
      { status: request.status, assignee: request.assignee ? referenceId(request.assignee) : null },
      update
    );

    if (!saved) throw httpError(409, 'The request changed while you were assigning it. Refresh and try again.');
    return toResponse(saved, false);
  }

  async function transition(user, id, input = {}) {
    requireAssignedStaff(user);
    const request = await findRequest(id);
    ensureCanManage(user, request);

    const nextStatus = input.status;
    if (!ALL_STATUSES.includes(nextStatus)) {
      throw httpError(400, 'Choose a valid request status.');
    }
    validateTransition(request, nextStatus, user);

    const comment = typeof input.comment === 'string' ? input.comment.trim().slice(0, 500) : '';
    const saved = await requestRepository.updateIf(
      id,
      { status: request.status },
      {
        $set: { status: nextStatus },
        $push: {
          statusHistory: {
            changedBy: user.id,
            fromStatus: request.status,
            toStatus: nextStatus,
            comment,
            changedAt: clock(),
          },
        },
      }
    );

    if (!saved) throw httpError(409, 'The request changed while you were updating it. Refresh and try again.');
    return toResponse(saved, false);
  }

  async function addComment(user, id, input = {}) {
    requireAssignedStaff(user);
    const request = await findRequest(id);
    ensureCanManage(user, request);
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    if (!body || body.length > 2000) {
      throw httpError(400, 'Comment must contain 1 to 2,000 characters.');
    }

    const saved = await requestRepository.updateIf(
      id,
      {},
      { $push: { comments: { author: user.id, body, createdAt: clock() } } }
    );
    if (!saved) throw httpError(404, 'Service request not found.');
    return toResponse(saved, false);
  }

  async function setDueAt(user, id, input = {}) {
    if (!['staff', 'management'].includes(user.role)) {
      throw httpError(403, 'Staff access is required.');
    }
    const request = await findRequest(id);
    ensureCanManage(user, request);

    let dueAt = null;
    if (input.dueAt !== null && input.dueAt !== '') {
      dueAt = new Date(input.dueAt);
      if (Number.isNaN(dueAt.getTime())) throw httpError(400, 'Enter a valid due date.');
    }

    const saved = await requestRepository.updateIf(id, {}, { $set: { dueAt } });
    if (!saved) throw httpError(404, 'Service request not found.');
    return toResponse(saved, false);
  }

  async function summary(user) {
    if (user.role !== 'management') {
      throw httpError(403, 'Management access is required.');
    }

    const now = clock();
    const [open, overdue, resolved, closed, byCategory] = await Promise.all([
      requestRepository.count({ status: { $in: OPEN_STATUSES } }),
      requestRepository.count({
        status: { $in: OPEN_STATUSES },
        dueAt: { $ne: null, $lt: now },
      }),
      requestRepository.count({ status: 'resolved' }),
      requestRepository.count({ status: 'closed' }),
      requestRepository.groupByCategory(OPEN_STATUSES),
    ]);

    return { open, overdue, resolved, closed, byCategory };
  }

  async function findRequest(id) {
    const request = await requestRepository.findById(id);
    if (!request) throw httpError(404, 'Service request not found.');
    return request;
  }

  return { create, list, getById, assign, transition, addComment, setDueAt, summary };
}

function validateNewRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError(400, 'Request details are required.');
  }

  const data = {
    title: typeof input.title === 'string' ? input.title.trim() : '',
    description: typeof input.description === 'string' ? input.description.trim() : '',
    location: typeof input.location === 'string' ? input.location.trim() : '',
    category: input.category,
    priority: input.priority || 'medium',
  };

  const details = {};
  if (!data.title || data.title.length > 120) details.title = 'Title is required (maximum 120 characters).';
  if (!data.description || data.description.length > 2000) details.description = 'Description is required (maximum 2,000 characters).';
  if (!data.location || data.location.length > 200) details.location = 'Location is required (maximum 200 characters).';
  if (!CATEGORIES.includes(data.category)) details.category = 'Choose a valid request category.';
  if (!PRIORITIES.includes(data.priority)) details.priority = 'Choose a valid request priority.';
  if (Object.keys(details).length) {
    const error = httpError(400, 'Check the required request fields.');
    error.details = details;
    throw error;
  }

  return data;
}

function createStatusFilter(status, now) {
  if (status === 'open') return { status: { $in: OPEN_STATUSES } };
  if (status === 'overdue') {
    return { status: { $in: OPEN_STATUSES }, dueAt: { $ne: null, $lt: now } };
  }
  if (ALL_STATUSES.includes(status)) return { status };
  return null;
}

function toResponse(request, requesterView) {
  const value = typeof request.toObject === 'function' ? request.toObject() : request;
  const response = {
    id: referenceId(value._id),
    title: value.title,
    description: value.description,
    category: value.category,
    location: value.location,
    priority: value.priority,
    status: value.status,
    dueAt: value.dueAt || null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    requester: publicReference(value.requester),
    ...(requesterView ? {} : { assignee: publicReference(value.assignee) }),
    statusHistory: (value.statusHistory || []).map((entry) => (
      requesterView
        ? { status: entry.toStatus, changedAt: entry.changedAt }
        : {
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            changedBy: publicReference(entry.changedBy),
            comment: entry.comment,
            changedAt: entry.changedAt,
          }
    )),
  };

  if (!requesterView) {
    response.comments = (value.comments || []).map((comment) => ({
      id: referenceId(comment._id),
      author: publicReference(comment.author),
      body: comment.body,
      createdAt: comment.createdAt,
    }));
  }

  return response;
}

function publicReference(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.name) {
    return { id: referenceId(value._id), name: value.name };
  }
  return { id: referenceId(value) };
}

function referenceId(value) {
  if (!value) return null;
  return String(value._id || value);
}

function ensureCanManage(user, request) {
  if (user.role === 'staff' && referenceId(request.assignee) !== user.id) {
    throw httpError(403, 'Only the assigned staff member or management can update this request.');
  }
}

function requireAssignedStaff(user) {
  if (user.role !== 'staff') {
    throw httpError(403, 'Staff access is required.');
  }
}

function parseInteger(value, defaultValue, min, max) {
  if (value === undefined) return defaultValue;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw httpError(400, `Value must be a whole number between ${min} and ${max}.`);
  }
  return number;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  createRequestService,
  OPEN_STATUSES,
  ALL_STATUSES,
  toResponse,
  validateNewRequest,
};
