# ----- Stage 1: Build -----
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy gradle wrapper files
COPY gradlew .
COPY gradle gradle

# Copy build definition files
COPY build.gradle settings.gradle ./

# Copy the source code
COPY src src

# Build the application skipping tests to speed up the container build process
# We use --no-daemon to avoid keeping the gradle daemon running in the ephemeral container
RUN ./gradlew build -x test --no-daemon

# ----- Stage 2: Runtime -----
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built jar file from the builder stage
# Standard spring boot convention puts it in build/libs
COPY --from=builder /app/build/libs/*SNAPSHOT.jar app.jar

# Expose standard application port
EXPOSE 8080

# Environment variables matching our spring config structure
# Default properties can be overridden at runtime via these ENV vars
ENV SPRING_PROFILES_ACTIVE=default \
    ARGOCD_URL=http://localhost:12004 \
    ARGOCD_API_KEY=mock-key-12345

# Run the jar file
ENTRYPOINT ["java", "-jar", "app.jar"]
