FROM node:22-bookworm-slim AS legacy
WORKDIR /legacy
COPY frontend/src/content/activities ./content
COPY frontend/public/activities ./public/activities
COPY backend/scripts/build-image-manifest.cjs ./build-image-manifest.cjs
RUN node build-image-manifest.cjs content public

FROM node:22-bookworm-slim AS organization
WORKDIR /organization
COPY frontend/src/content/eesa ./content/eesa
COPY frontend/src/content/teams ./content/teams
COPY frontend/public ./public
COPY backend/scripts/build-organization-manifest.cjs ./build-organization-manifest.cjs
RUN node build-organization-manifest.cjs content public

FROM node:22-bookworm-slim
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN npm run db:generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY shared /app/shared
COPY --from=legacy /legacy/content ./legacy-content
COPY --from=organization /organization/content ./organization-content
RUN npm run build
ENV NODE_ENV=production
ENV LEGACY_CONTENT_DIR=/app/backend/legacy-content
ENV ORGANIZATION_CONTENT_DIR=/app/backend/organization-content
ENV MEDIA_ROOT=/var/lib/nycuee/media
RUN mkdir -p /var/lib/nycuee/media && chown node:node /var/lib/nycuee/media
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run content:bootstrap && npm start"]
