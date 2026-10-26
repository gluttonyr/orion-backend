FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /app/uploads && chown -R node:node /app

ENV UPLOAD_ROOT=/app/uploads
EXPOSE 3000

# Starts as root only to hand the (possibly root-owned) mounted uploads volume to `node`, then drops privileges.
CMD ["sh", "-c", "mkdir -p \"$UPLOAD_ROOT\" && chown -R node:node \"$UPLOAD_ROOT\" && exec setpriv --reuid=node --regid=node --init-groups node dist/main.js"]
