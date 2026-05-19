# Stage 1: Build the frontend
FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend (outputs to ./dist)
RUN npm run build

# Stage 2: Build the backend with embedded frontend
FROM --platform=$BUILDPLATFORM golang:1.25 AS backend-builder

WORKDIR /app

# Copy Go module files
COPY backend/go.mod backend/go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod download

# Copy backend source
COPY backend/ .

# Copy built frontend into the static embed directory
COPY --from=frontend-builder /frontend/dist ./internal/static/dist

# Build Go binary with embedded frontend
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=linux GOARCH=$TARGETARCH go build -o vps-monitor ./cmd/server

# Stage 3: Final runtime image with SSH client for remote Docker hosts
FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssh-client util-linux \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the binary (frontend is embedded)
COPY --from=backend-builder /app/vps-monitor ./vps-monitor

ENTRYPOINT ["/app/vps-monitor"]
