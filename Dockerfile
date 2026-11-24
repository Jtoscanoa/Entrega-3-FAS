# ADR-09: una sola imagen. Etapa 1 compila la SPA; etapa 2 la mete en static/ y empaqueta el jar; etapa 3 ejecuta.
FROM node:20-alpine AS spa
WORKDIR /spa
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY config config
COPY src src
COPY --from=spa /spa/dist src/main/resources/static
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/apuntado-server.jar apuntado-server.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "apuntado-server.jar"]
