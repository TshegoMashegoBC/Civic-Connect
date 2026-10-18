const rules = [
  {
    from: 'submitted',
    to: 'assigned',
    roles: ['staff', 'management'],
    validate: (_request, _user, details) =>
      details.assigneeId ? null : 'Assigning a request requires a staff member.',
  },
  { from: 'submitted', to: 'rejected', roles: ['staff'] },
  { from: 'assigned', to: 'in_progress', roles: ['staff'] },
  { from: 'assigned', to: 'rejected', roles: ['staff'] },
  { from: 'in_progress', to: 'resolved', roles: ['staff'] },
  { from: 'in_progress', to: 'rejected', roles: ['staff'] },
  { from: 'resolved', to: 'closed', roles: ['staff'] },
];

function validateTransition(request, nextStatus, user, details = {}) {
  const rule = rules.find(
    (candidate) => candidate.from === request.status && candidate.to === nextStatus
  );

  if (!rule) {
    if (['closed', 'rejected'].includes(request.status)) {
      throw workflowError(409, `Cannot change status from final status ${request.status}.`);
    }
    throw workflowError(409, `Cannot change status from ${request.status} to ${nextStatus}.`);
  }

  if (!rule.roles.includes(user.role)) {
    throw workflowError(403, 'Only authorised staff can perform this status transition.');
  }

  const validationMessage = rule.validate?.(request, user, details);
  if (validationMessage) throw workflowError(400, validationMessage);
  return rule;
}

function getAllowedTransitions(request, user) {
  return rules
    .filter((rule) => rule.from === request.status && rule.roles.includes(user.role))
    .map((rule) => ({ to: rule.to }));
}

function workflowError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}

module.exports = { validateTransition, getAllowedTransitions, rules };
