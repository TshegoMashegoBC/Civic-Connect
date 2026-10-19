const ServiceRequest = require('../models/ServiceRequest');

function withDetails(query) {
  return query
    .populate('requester', 'name role')
    .populate('assignee', 'name role')
    .populate('statusHistory.changedBy', 'name role')
    .populate('comments.author', 'name role');
}

async function findMany(filter, { page, pageSize }) {
  const [items, total] = await Promise.all([
    withDetails(ServiceRequest.find(filter))
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ServiceRequest.countDocuments(filter),
  ]);

  return { items, total };
}

function findById(id) {
  return withDetails(ServiceRequest.findById(id));
}

function create(data) {
  return ServiceRequest.create(data);
}

function updateIf(id, condition, update) {
  return withDetails(
    ServiceRequest.findOneAndUpdate(
      { _id: id, ...condition },
      update,
      { new: true, runValidators: true }
    )
  );
}

function count(filter) {
  return ServiceRequest.countDocuments(filter);
}

function groupByCategory(openStatuses) {
  return ServiceRequest.aggregate([
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        open: {
          $sum: { $cond: [{ $in: ['$status', openStatuses] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ['$status', openStatuses] },
                  { $ne: ['$dueAt', null] },
                  { $lt: ['$dueAt', new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

module.exports = { findMany, findById, create, updateIf, count, groupByCategory };
