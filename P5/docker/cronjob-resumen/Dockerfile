FROM node:20-alpine AS build
WORKDIR /app
COPY src/cronjob-resumen/package.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY src/cronjob-resumen/package.json ./
COPY src/cronjob-resumen/mapear.js ./
COPY src/cronjob-resumen/index.js ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "index.js"]
