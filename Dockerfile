# ARG to keep node version centralized.
ARG NODE_VERSION=22-alpine

###################
# BASE
###################

FROM node:${NODE_VERSION} AS base

WORKDIR /usr/src/app

###################
# DEVELOPMENT
###################

FROM base AS development

COPY package*.json ./
RUN npm ci

COPY . .
USER node

###################
# BUILD
###################

FROM base AS build

COPY --from=development /usr/src/app .

RUN npm run build

# Remove development dependencies.
RUN npm ci --omit=dev && npm cache clean --force

USER node

###################
# PRODUCTION
###################

FROM node:${NODE_VERSION} AS production

WORKDIR /usr/src/app

RUN apk add --no-cache curl

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=4096"

USER node

CMD [ "node", "dist/src/main.js" ]
