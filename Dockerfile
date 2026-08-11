# syntax=docker/dockerfile:1

# --- Builder: deterministic production build --------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Lockfile-only layer: dependency changes bust this cache, code changes don't.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Relative base is correct on EVERY host because nginx proxies /api same-origin.
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# --- Runtime: nginx serving the SPA + /api reverse proxy --------------------
# Pinned nginx runtime (spec §4). To bump: run
#   docker run --rm nginx:stable-alpine nginx -v
# and update this tag to the printed version (keep the -alpine suffix).
FROM nginx:1.30.4-alpine

# The official entrypoint renders /etc/nginx/templates/*.template with envsubst
# (only variables present in the environment are substituted; nginx runtime
# vars like $uri survive) into /etc/nginx/conf.d/. Remove the stock config so
# ours is the only server block.
RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

# Render injects PORT; this is the local default.
ENV PORT=80

EXPOSE 80
