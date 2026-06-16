FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY server ./server
RUN npm run build:server

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/dist-server ./dist-server

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist-server/index.js"]
