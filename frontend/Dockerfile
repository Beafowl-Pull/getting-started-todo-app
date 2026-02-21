FROM node:24 AS base
WORKDIR /usr/local/app

FROM base AS client-base
COPY package.json client/package-lock.json ./
RUN npm install
COPY .eslintrc.cjs client/index.html client/vite.config.js ./
COPY public ./public
COPY src ./src

FROM frontend-base AS client-dev
CMD ["npm", "run", "dev"]

FROM frontend-base AS client-build
RUN npm run build