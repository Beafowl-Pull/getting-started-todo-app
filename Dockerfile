FROM node:24 AS base
WORKDIR /usr/local/app

FROM base AS client-base
COPY frontend/package.json client/package-lock.json ./
RUN npm install
COPY frontend/.eslintrc.cjs client/index.html client/vite.config.js ./
COPY frontend/public ./public
COPY frontend/src ./src

FROM client-base AS client-dev
CMD ["npm", "run", "dev"]

FROM client-base AS client-build
RUN npm run build

FROM base AS backend-dev
COPY backend/package.json backend/package-lock.json ./
RUN npm install
COPY backend/spec ./spec
COPY backend/src ./src
CMD ["npm", "run", "dev"]

FROM backend-dev AS test
RUN npm run test

FROM base AS final
ENV NODE_ENV=production
COPY --from=test /usr/local/app/package.json /usr/local/app/package-lock.json ./
RUN npm ci --production && \
    npm cache clean --force
COPY backend/src ./src
COPY --from=client-build /usr/local/app/dist ./src/static
EXPOSE 3000
CMD ["node", "src/index.ts"]