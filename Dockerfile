ARG BUILD_FROM=ghcr.io/hassio-addons/base:17.1.0
FROM ${BUILD_FROM}

# Copy frontend assets
COPY frontend/build/ /app/static/

# Copy the architecture-specific binary
ARG TARGETARCH
ARG TARGETVARIANT
COPY backend/target/${TARGETARCH}${TARGETVARIANT:+/}${TARGETVARIANT}/ha-advanced-automation /app/ha-advanced-automation

WORKDIR /app

# Make binary executable
RUN chmod +x /app/ha-advanced-automation

# Set up Home Assistant Add-on specifics
ENV PORT=3001
EXPOSE 3001

# Start the application
CMD ["/app/ha-advanced-automation"]
