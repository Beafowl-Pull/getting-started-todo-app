FROM node:24 AS base
WORKDIR /usr/local/app

FROM base AS frontend-base
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY eslint.config.js ./index.html ./vite.config.ts ./
COPY public ./public
COPY src ./src

FROM frontend-base AS frontend-dev
CMD ["npm", "run", "dev"]

FROM mcr.microsoft.com/playwright:v1.50.0-noble AS test
WORKDIR /app
COPY ./package.json ./package-lock.json ./
RUN npm install
RUN npx playwright install --with-deps
COPY eslint.config.js ./index.html ./vite.config.ts ./
COPY public ./public
COPY src ./src
COPY ./playwright.config.ts ./
COPY playwright-tests ./playwright-tests
COPY ./tsconfig.json ./tsconfig.test.json ./
CMD ["npm", "run", "test:e2e"]

FROM frontend-base AS frontend-build
RUN npm run build