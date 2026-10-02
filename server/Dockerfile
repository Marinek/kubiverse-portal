# ----- Stage 1: Build -----
FROM gradle:9-jdk21-alpine AS builder

WORKDIR /app

# Copy build definition files
COPY . .

# Build the application skipping tests to speed up the container build process
# We use --no-daemon to avoid keeping the gradle daemon running in the ephemeral container
RUN gradle build -x test --no-daemon

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
ENV ARGOCD_URL=http://localhost:12004 \
    ARGOCD_API_KEY=mock-key-12345

# Run the jar file
ENTRYPOINT ["java", "-jar", "app.jar"]
