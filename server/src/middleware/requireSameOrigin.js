const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function createRequireSameOrigin(clientOrigin) {
  return function requireSameOrigin(req, res, next) {
    const origin = req.get('origin');

    if (
      MUTATING_METHODS.has(req.method) &&
      origin &&
      origin !== clientOrigin
    ) {
      return res.status(403).json({ message: 'Request origin is not allowed.' });
    }

    return next();
  };
}

module.exports = createRequireSameOrigin;
