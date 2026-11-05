# ========================================================
# ADHYAY Backend — Production Dockerfile (Java 21)
# Optimized for free cloud platforms (Render, Railway, Koyeb)
# ========================================================

# Stage 1: Build the JAR
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Minimal Runtime Environment
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl ffmpeg

# Non-root user for security
RUN addgroup -S adhyay && adduser -S adhyay -G adhyay
USER adhyay

COPY --from=builder /app/target/*.jar app.jar

ENV PORT=8081
EXPOSE 8081

# Container memory safety for free tier (512MB limit)
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]

