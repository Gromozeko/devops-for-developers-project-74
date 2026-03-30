FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN npm prune --omit=dev

FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/config ./config

EXPOSE 8080

CMD ["npm", "run", "start"]
