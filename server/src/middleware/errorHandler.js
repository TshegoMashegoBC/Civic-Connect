function errorHandler(error, _req, res, _next) {
  console.error(error);

  const isMongooseInputError =
    error.name === 'ValidationError' || error.name === 'CastError';
  const statusCode =
    error.code === 11000
      ? 409
      : error.type === 'entity.parse.failed'
        ? 400
        : error.statusCode || error.status || (isMongooseInputError ? 400 : 500);
  const message = statusCode >= 500 ? 'Internal server error' : error.message;
  return res.status(statusCode).json({
    message,
    ...(error.details ? { details: error.details } : {}),
  });
}

module.exports = errorHandler;
