# Etapa 1: build con Maven (usa el cache de dependencias de la imagen base)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY src/pago-service/pom.xml ./
RUN mvn dependency:go-offline -B
COPY src/pago-service/src ./src
RUN mvn clean package -DskipTests -B

# Etapa 2: runtime minimo, solo JRE + el jar generado
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app
COPY --from=build /app/target/pago-service-1.0.0.jar app.jar

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3004
ENTRYPOINT ["java", "-jar", "app.jar"]
