# syntax=docker/dockerfile:1

##########################################################
# Stage 1: install dependencies (cached layer)
##########################################################
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

##########################################################
# Stage 2: build the application
##########################################################
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

##########################################################
# Stage 3: minimal runtime image (non root)
##########################################################
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as the unprivileged node user shipped with the base image.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

# dumb init style: let Node handle SIGTERM for graceful shutdown.
CMD ["node", "dist/main.js"]
