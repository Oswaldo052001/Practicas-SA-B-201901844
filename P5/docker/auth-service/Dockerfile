# Etapa 1: build (compila TypeScript)
FROM node:20-alpine AS build
WORKDIR /app
COPY src/auth-service/package.json ./
RUN npm install
COPY src/auth-service/tsconfig.json ./
COPY src/auth-service/src ./src
RUN npm run build

# Etapa 2: runtime minimo, solo dependencias de produccion y el bundle compilado
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY src/auth-service/package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Usuario no root, requerido por securityContext.runAsNonRoot
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", "dist/index.js"]
