FROM node:22-alpine3.22 AS client-build

RUN apk upgrade --no-cache

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine3.22 AS production

RUN apk upgrade --no-cache

ENV NODE_ENV=production
ENV PORT=10000

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/package.json
COPY server/src ./server/src
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 10000
USER node
CMD ["node", "server/src/server.js"]
