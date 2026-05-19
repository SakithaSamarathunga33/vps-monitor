#!/usr/bin/env bash
set -euo pipefail

APP_NAME="vps-monitor"
INSTALL_DIR="${INSTALL_DIR:-/opt/vps-monitor}"
IMAGE="${VPS_MONITOR_IMAGE:-ghcr.io/hhftechnology/vps-monitor:latest}"
PORT="${VPS_MONITOR_PORT:-6789}"
HOSTNAME_OVERRIDE="${HOSTNAME_OVERRIDE:-VPS Monitor}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

detect_public_ip() {
  curl -fsS --max-time 3 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_VPS_IP"
}

random_secret() {
  if need_cmd openssl; then
    openssl rand -base64 32
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48
  fi
}

random_password() {
  if need_cmd openssl; then
    openssl rand -base64 18 | tr -d '=+/' | head -c 20
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20
  fi
}

install_docker() {
  if need_cmd docker; then
    return
  fi

  echo "Docker is not installed. Installing Docker..."
  if need_cmd curl; then
    curl -fsSL https://get.docker.com | as_root sh
  else
    echo "curl is required to install Docker automatically." >&2
    exit 1
  fi
}

ensure_compose() {
  if docker compose version >/dev/null 2>&1; then
    return
  fi

  echo "Docker Compose plugin is required. Install Docker Compose and rerun this script." >&2
  exit 1
}

main() {
  if ! need_cmd curl; then
    echo "curl is required." >&2
    exit 1
  fi

  install_docker
  ensure_compose

  echo "Pulling $IMAGE..."
  as_root docker pull "$IMAGE"

  ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(random_password)}"
  JWT_SECRET="${JWT_SECRET:-$(random_secret)}"

  echo "Generating admin password hash..."
  ADMIN_PASSWORD_HASH="$(as_root docker run --rm "$IMAGE" hash-password "$ADMIN_PASSWORD" | tail -n 1)"

  as_root mkdir -p "$INSTALL_DIR"

  as_root tee "$INSTALL_DIR/.env" >/dev/null <<EOF
COMPOSE_PROJECT_NAME=$APP_NAME
VPS_MONITOR_IMAGE=$IMAGE
VPS_MONITOR_PORT=$PORT
HOSTNAME_OVERRIDE=$HOSTNAME_OVERRIDE
DOCKER_HOSTS=local=unix:///var/run/docker.sock
EOF

  as_root tee "$INSTALL_DIR/docker-compose.yml" >/dev/null <<'EOF'
services:
  vps-monitor:
    image: ${VPS_MONITOR_IMAGE:-ghcr.io/hhftechnology/vps-monitor:latest}
    container_name: vps-monitor
    restart: unless-stopped
    pid: "host"
    privileged: true
    cap_add:
      - KILL
    ports:
      - "${VPS_MONITOR_PORT:-6789}:6789"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /proc:/host/proc:ro
      - vps-monitor-data:/data
    environment:
      - CONFIG_PATH=/data/config.json
      - DATA_DIR=/data
      - SCANNER_DB_PATH=/data/scanner.db
      - HOSTNAME_OVERRIDE=${HOSTNAME_OVERRIDE:-VPS Monitor}
      - DOCKER_HOSTS=${DOCKER_HOSTS:-local=unix:///var/run/docker.sock}

volumes:
  vps-monitor-data:
EOF

  CONFIG_JSON="$(cat <<EOF
{
  "auth": {
    "enabled": true,
    "jwtSecret": "$JWT_SECRET",
    "adminUsername": "$ADMIN_USERNAME",
    "adminPasswordHash": "$ADMIN_PASSWORD_HASH"
  },
  "readOnly": false
}
EOF
)"

  volume_name="${APP_NAME}_vps-monitor-data"
  if ! as_root docker volume inspect "$volume_name" >/dev/null 2>&1; then
    as_root docker volume create "$volume_name" >/dev/null
  fi

  echo "Writing initial config..."
  printf '%s\n' "$CONFIG_JSON" | as_root docker run --rm -i -v "$volume_name:/data" debian:bookworm-slim sh -c 'cat > /data/config.json && chmod 600 /data/config.json'

  echo "Starting VPS Monitor..."
  (cd "$INSTALL_DIR" && as_root docker compose up -d)

  public_ip="$(detect_public_ip)"

  cat <<EOF

VPS Monitor is running.

URL:      http://$public_ip:$PORT
Username: $ADMIN_USERNAME
Password: $ADMIN_PASSWORD

Install dir: $INSTALL_DIR

Useful commands:
  cd $INSTALL_DIR && docker compose logs -f
  cd $INSTALL_DIR && docker compose pull && docker compose up -d
  cd $INSTALL_DIR && docker compose down

Keep the generated password somewhere safe.
EOF
}

main "$@"
