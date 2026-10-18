// Fast adapter-backed HTTP tests stay independent of a locally installed mongod.
const { createApp } = require('../../server/src/app');
const { createAuthService } = require('../../server/src/services/authService');
const { createRequestService } = require('../../server/src/services/requestService');
const { createMemoryRepositories } = require('../support/memoryRepositories');

let context;

exports.connect = async () => {
  const repositories = createMemoryRepositories();
  const jwtSecret = process.env.JWT_SECRET;
  const authService = createAuthService({
    userRepository: repositories.userRepository,
    jwtSecret,
  });
  const requestService = createRequestService({
    requestRepository: repositories.requestRepository,
    userRepository: repositories.userRepository,
  });
  context = {
    ...repositories,
    app: createApp({
      userRepository: repositories.userRepository,
      requestRepository: repositories.requestRepository,
      authService,
      requestService,
      jwtSecret,
    }),
  };
};

exports.clear = async () => {
  context.users.clear();
  context.requests.clear();
};

exports.close = async () => {
  context = undefined;
};

exports.getContext = () => {
  if (!context) throw new Error('Test API was not initialized. Call connect() first.');
  return context;
};
