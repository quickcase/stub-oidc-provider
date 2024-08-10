# --- Base ---
FROM node:16-alpine AS base

ENV WORKDIR=/home/node/app

WORKDIR ${WORKDIR}

COPY --chown=node:node package*.json ./

RUN mkdir -p ${WORKDIR}/node_modules \
 && npm ci \
 && chown -R node:node ${WORKDIR}

USER node

# --- Runtime ---
FROM base AS runtime

ARG CI_BRANCH="main"
ARG CI_COMMIT=""
ARG CI_REPO=""

LABEL branch=${CI_BRANCH}
LABEL commit=${CI_COMMIT}
LABEL org.opencontainers.image.source=${CI_REPO}

COPY --chown=node:node . .

EXPOSE 9000

CMD [ "node", "./bin/www" ]
