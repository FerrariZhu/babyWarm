FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY web/package.json web/package.json
COPY admin/package.json admin/package.json
RUN npm ci

FROM dependencies AS build

COPY . .
RUN npm run build -w web && npm run build -w admin

FROM base AS runtime

ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nextjs \
  && useradd --system --uid 1001 --gid nextjs nextjs
COPY --from=build --chown=nextjs:nextjs /app /app
USER nextjs

FROM runtime AS web

ENV APP=web
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["sh", "-c", "npm run start -w \"$APP\""]

FROM runtime AS admin

ENV APP=admin
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001
CMD ["sh", "-c", "npm run start -w \"$APP\""]
