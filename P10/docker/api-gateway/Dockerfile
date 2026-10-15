# Practica 10 - api-gateway instrumentado con OpenTelemetry.
# Contexto de build: la carpeta P10 (ver .github/workflows/p10-cicd.yml).
# Igual que en P5/P8, pero con "npm ci" (usa package-lock.json: las versiones
# de OpenTelemetry quedan fijas y el build es reproducible).

# Etapa 1: build (compila TypeScript)
FROM node:20-alpine AS build
WORKDIR /app
COPY src/api-gateway/package.json src/api-gateway/package-lock.json ./
RUN npm ci
COPY src/api-gateway/tsconfig.json ./
COPY src/api-gateway/src ./src
RUN npm run build

# Etapa 2: runtime minimo, solo dependencias de produccion y el bundle compilado
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY src/api-gateway/package.json src/api-gateway/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Usuario no root, requerido por securityContext.runAsNonRoot
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 3000/3001/3003: puerto HTTP del servicio. 9464: /metrics (Prometheus).
EXPOSE 3000 9464
CMD ["node", "dist/index.js"]
