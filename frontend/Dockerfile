FROM node:24 AS base
WORKDIR /usr/local/app

FROM base AS frontend-base
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY .eslintrc.cjs ./index.html ./vite.config.ts ./
COPY public ./public
COPY src ./src

FROM frontend-base AS frontend-dev
CMD ["npm", "run", "dev"]

FROM frontend-base AS frontend-build
RUN npm run build