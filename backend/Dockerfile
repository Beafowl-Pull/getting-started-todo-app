FROM node:24 AS base
WORKDIR /usr/local/app

FROM base AS backend-dev
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY ./src ./src
CMD ["npm", "run", "dev"]

FROM backend-dev AS test
COPY jest.config.json ./
COPY __tests__ ./__tests__
COPY tsconfig.json tsconfig.test.json ./
CMD ["npm", "run", "test"]

FROM base AS final
ENV NODE_ENV=production
COPY --from=test /usr/local/app/package.json /usr/local/app/package-lock.json ./
RUN npm ci --production && \
    npm cache clean --force
COPY ./src ./src
COPY --from=client-build /usr/local/app/dist ./src/static
EXPOSE 3000
CMD ["node", "src/index.ts"]