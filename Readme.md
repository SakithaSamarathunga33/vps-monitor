# VPS Monitor

VPS Monitor is a Docker-based VPS dashboard for containers, logs, stats, processes, images, networks, alerts, scanners, and database browsing.

## One-Line VPS Install

On a fresh VPS with Ubuntu/Debian, run:

```bash
curl -fsSL https://raw.githubusercontent.com/hhftechnology/vps-monitor/main/scripts/install.sh | sudo bash
```

The installer will:

- Install Docker if it is missing.
- Pull the published image from GitHub Container Registry.
- Create `/opt/vps-monitor/docker-compose.yml`.
- Create a secure admin account with a generated password.
- Start the app on port `6789`.

After install, open:

```text
http://YOUR_VPS_IP:6789
```

The installer prints the generated username and password at the end.

## Install Options

You can override defaults with environment variables:

```bash
curl -fsSL https://raw.githubusercontent.com/hhftechnology/vps-monitor/main/scripts/install.sh \
  | sudo env VPS_MONITOR_PORT=8080 HOSTNAME_OVERRIDE="Production VPS" bash
```

Use a specific image:

```bash
curl -fsSL https://raw.githubusercontent.com/hhftechnology/vps-monitor/main/scripts/install.sh \
  | sudo env VPS_MONITOR_IMAGE=ghcr.io/hhftechnology/vps-monitor:v1.0.0 bash
```

Set your own admin credentials:

```bash
curl -fsSL https://raw.githubusercontent.com/hhftechnology/vps-monitor/main/scripts/install.sh \
  | sudo env ADMIN_USERNAME=admin ADMIN_PASSWORD='change-me-now' bash
```

## Update

```bash
cd /opt/vps-monitor
sudo docker compose pull
sudo docker compose up -d
```

## Logs

```bash
cd /opt/vps-monitor
sudo docker compose logs -f
```

## Stop

```bash
cd /opt/vps-monitor
sudo docker compose down
```

## Docker Image

The production image is published to GitHub Container Registry:

```text
ghcr.io/hhftechnology/vps-monitor:latest
```

Tagged releases are published as:

```text
ghcr.io/hhftechnology/vps-monitor:vX.Y.Z
```

## Publishing From This Repo

The workflow at `.github/workflows/docker-publish.yml` publishes a multi-architecture Docker image to GHCR when:

- code is pushed to `main`
- a tag like `v1.0.0` is pushed
- the workflow is manually run

For a new public repo:

1. Push this repository to GitHub.
2. Enable GitHub Actions.
3. Push to `main`.
4. In GitHub Packages, set the package visibility to public if needed.
5. Update the install command/image name in this README if your repository owner/name is different.

## Manual Compose Deployment

```bash
mkdir -p /opt/vps-monitor
cd /opt/vps-monitor
curl -fsSLO https://raw.githubusercontent.com/hhftechnology/vps-monitor/main/docker-compose.prod.yml
mv docker-compose.prod.yml docker-compose.yml
sudo docker compose up -d
```

Manual deployment starts without generated auth config unless you create `/data/config.json` or set auth through the UI/settings flow. The one-line installer is recommended for secured default installs.
