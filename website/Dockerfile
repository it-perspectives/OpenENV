# syntax=docker/dockerfile:1
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY website/package.json ./website/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund

COPY src/ ./src/
COPY schemas/ ./schemas/
COPY examples/ ./examples/
COPY docs/openenv.svg ./docs/openenv.svg
COPY SPEC.md ./SPEC.md
COPY scripts/prepare-site.js scripts/bundle-validator.js ./scripts/
COPY website/ ./website/
RUN npm run site:build

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:56b8272e43a0525f67aed68d1e0794a712d10e3e45a563e118e9a77c817e6f86 AS runtime
COPY website/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/website/dist/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
