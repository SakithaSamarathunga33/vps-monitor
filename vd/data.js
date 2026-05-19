/* Mock data for Helm VPS monitor */
(function(){
const HOST = {
  name: "production-01",
  distro: "Debian 12",
  kernel: "6.8.0-111-generic",
  uptime: "14d 6h 22m",
  cpu: { cores: 4, model: "Intel Xeon E-2386G @ 3.5GHz", usage: 23 },
  memory: { used: 1.5, total: 3.7, unit: "GB", pct: 40 },
  disk: { used: 19, total: 75, free: 56, unit: "GB", pct: 26 },
  swap: { used: 0.2, total: 2.0, pct: 10 },
  network: { rx: 384, tx: 92, unit: "KB/s" },
  load: [0.42, 0.51, 0.48],
  apps: 10,
  ip: "162.55.214.86",
  region: "Helsinki, FI"
};

// random walk for sparklines
function walk(seed, len, base=50, vol=8) {
  let s = seed; const out = [];
  for (let i=0;i<len;i++){
    s = (s * 9301 + 49297) % 233280;
    const r = s/233280;
    base += (r-0.5)*vol;
    base = Math.max(2, Math.min(98, base));
    out.push(base);
  }
  return out;
}

const SPARKS = {
  cpu: walk(11, 60, 22, 8),
  cpuLong: walk(11, 180, 22, 8),
  mem: walk(7, 60, 40, 4),
  memLong: walk(7, 180, 40, 4),
  disk: walk(91, 60, 26, 1.6),
  net: walk(23, 60, 30, 22),
  netTx: walk(33, 60, 18, 18),
  load: walk(41, 60, 18, 6),
  io: walk(53, 60, 25, 30),
};

const CONTAINERS = [
  { name: "vps-monitor-o12w82yycon", img: "o12w82yycon4avqie5egbg75_vps-mon:latest", state: "running", uptime: "12m", created: "May 19, 6:25 AM", cpu: 0.0, ram: 0.6, ports: "3000/tcp", node: "primary" },
  { name: "z13q1pr5wxh003jbdfmgyo3b", img: "z13q1pr5wxh003jbdfmgyo3b:6e7e22", state: "running", uptime: "7h", created: "May 18, 10:47 PM", cpu: 0.0, ram: 1.5, ports: "—", node: "primary" },
  { name: "xbtcom504737r6a80gucgtom", img: "xbtcom504737r6a80gucgtom:420bf1", state: "running", uptime: "2d", created: "May 16, 7:50 AM", cpu: 0.0, ram: 3.4, ports: "8080/tcp", node: "primary" },
  { name: "coolify-proxy", img: "traefik:v3.6", state: "running", uptime: "3d", created: "May 15, 8:23 PM", cpu: 0.4, ram: 1.1, ports: "80,443/tcp", node: "primary" },
  { name: "coolify-sentinel", img: "ghcr.io/coollabsio/sentinel:0.0.21", state: "running", uptime: "3d", created: "May 15, 8:16 PM", cpu: 0.2, ram: 0.5, ports: "—", node: "primary" },
  { name: "coolify-realtime", img: "ghcr.io/coollabsio/coolify-realtime:1.0.10", state: "running", uptime: "3d", created: "May 15, 8:16 PM", cpu: 0.1, ram: 0.8, ports: "6001/tcp", node: "primary" },
  { name: "coolify-db", img: "postgres:15-alpine", state: "running", uptime: "3d", created: "May 15, 8:15 PM", cpu: 0.3, ram: 2.1, ports: "5432/tcp", node: "primary" },
  { name: "coolify-redis", img: "redis:7-alpine", state: "running", uptime: "3d", created: "May 15, 8:15 PM", cpu: 0.1, ram: 0.4, ports: "6379/tcp", node: "primary" },
  { name: "tg-bot-prod", img: "ghcr.io/myorg/tg-bot:v0.4.2", state: "running", uptime: "6d", created: "May 13, 2:11 PM", cpu: 0.0, ram: 0.2, ports: "—", node: "primary" },
  { name: "minio-store", img: "minio/minio:RELEASE.2025-04-12", state: "running", uptime: "9d", created: "May 10, 9:02 AM", cpu: 0.5, ram: 1.8, ports: "9000,9001/tcp", node: "primary" },
  { name: "old-staging-api", img: "ghcr.io/myorg/api:v0.3.0", state: "exited", uptime: "—", created: "May 04, 11:18 AM", cpu: 0.0, ram: 0.0, ports: "—", node: "primary" },
  { name: "perftest-runner", img: "k6io/k6:0.50", state: "stopped", uptime: "—", created: "May 02, 6:40 PM", cpu: 0.0, ram: 0.0, ports: "—", node: "primary" },
];

const PROCESSES = [
  { pid: 1024, user: "root", cpu: 12.4, mem: 4.2, virt: "1.4G", res: "152M", cmd: "node /app/server.js", state: "S", time: "01:22:14" },
  { pid: 2381, user: "postgres", cpu: 8.7, mem: 6.8, virt: "892M", res: "248M", cmd: "postgres: writer", state: "S", time: "12:04:38" },
  { pid: 982, user: "root", cpu: 6.1, mem: 1.4, virt: "412M", res: "52M", cmd: "/usr/bin/dockerd -H fd://", state: "S", time: "1d 02:18" },
  { pid: 4012, user: "1000", cpu: 4.3, mem: 2.1, virt: "688M", res: "76M", cmd: "traefik --providers.docker", state: "S", time: "03:11:42" },
  { pid: 3201, user: "redis", cpu: 2.9, mem: 0.8, virt: "172M", res: "31M", cmd: "redis-server *:6379", state: "S", time: "06:18:09" },
  { pid: 1112, user: "root", cpu: 1.7, mem: 0.6, virt: "98M", res: "22M", cmd: "sshd: /usr/sbin/sshd -D", state: "S", time: "1d 02:18" },
  { pid: 7741, user: "node", cpu: 1.2, mem: 1.9, virt: "1.1G", res: "71M", cmd: "node next-server (v15.0)", state: "S", time: "02:44:12" },
  { pid: 1820, user: "root", cpu: 0.9, mem: 0.3, virt: "44M", res: "11M", cmd: "/lib/systemd/systemd-journald", state: "S", time: "1d 02:19" },
  { pid: 6044, user: "minio", cpu: 0.7, mem: 1.3, virt: "1.8G", res: "48M", cmd: "minio server /data --console-address :9001", state: "S", time: "04:08:51" },
  { pid: 1180, user: "root", cpu: 0.5, mem: 0.2, virt: "32M", res: "8M", cmd: "/usr/sbin/cron -f", state: "S", time: "1d 02:18" },
  { pid: 9241, user: "root", cpu: 0.2, mem: 0.4, virt: "112M", res: "14M", cmd: "containerd-shim-runc-v2", state: "S", time: "06:18:09" },
  { pid: 9244, user: "root", cpu: 0.2, mem: 0.4, virt: "112M", res: "14M", cmd: "containerd-shim-runc-v2", state: "S", time: "06:18:09" },
  { pid: 9248, user: "root", cpu: 0.1, mem: 0.3, virt: "98M", res: "12M", cmd: "containerd-shim-runc-v2", state: "S", time: "06:18:09" },
];

const IMAGES = [
  { repo: "traefik", tag: "v3.6", id: "sha256:a91c8b4f", size: "184 MB", created: "May 15", used: 1, layers: 11, vulns: { crit: 0, high: 1, med: 4, low: 12 } },
  { repo: "postgres", tag: "15-alpine", id: "sha256:7d4e221c", size: "246 MB", created: "May 15", used: 1, layers: 9, vulns: { crit: 0, high: 0, med: 2, low: 6 } },
  { repo: "redis", tag: "7-alpine", id: "sha256:c81e3aa1", size: "41 MB", created: "May 15", used: 1, layers: 7, vulns: { crit: 0, high: 0, med: 1, low: 3 } },
  { repo: "ghcr.io/coollabsio/sentinel", tag: "0.0.21", id: "sha256:6201bff0", size: "92 MB", created: "May 15", used: 1, layers: 6, vulns: { crit: 0, high: 0, med: 0, low: 2 } },
  { repo: "ghcr.io/coollabsio/coolify-realtime", tag: "1.0.10", id: "sha256:11a8eef0", size: "118 MB", created: "May 15", used: 1, layers: 9, vulns: { crit: 0, high: 2, med: 5, low: 8 } },
  { repo: "minio/minio", tag: "RELEASE.2025-04-12", id: "sha256:42cd1ab9", size: "204 MB", created: "May 10", used: 1, layers: 12, vulns: { crit: 1, high: 3, med: 7, low: 14 } },
  { repo: "ghcr.io/myorg/tg-bot", tag: "v0.4.2", id: "sha256:88d8ff32", size: "128 MB", created: "May 13", used: 1, layers: 10, vulns: { crit: 0, high: 0, med: 3, low: 9 } },
  { repo: "ghcr.io/myorg/api", tag: "v0.3.0", id: "sha256:9aa1c021", size: "162 MB", created: "May 04", used: 0, layers: 11, vulns: { crit: 2, high: 5, med: 11, low: 18 } },
  { repo: "k6io/k6", tag: "0.50", id: "sha256:e22c00dd", size: "78 MB", created: "May 02", used: 0, layers: 8, vulns: { crit: 0, high: 0, med: 1, low: 4 } },
  { repo: "node", tag: "20-bookworm-slim", id: "sha256:2010a1bb", size: "186 MB", created: "Apr 28", used: 0, layers: 8, vulns: { crit: 0, high: 1, med: 3, low: 7 } },
];

const NETWORKS = [
  { name: "coolify", driver: "bridge", scope: "local", subnet: "172.18.0.0/16", gateway: "172.18.0.1", containers: 8, ipam: "default", attachable: true, internal: false },
  { name: "bridge", driver: "bridge", scope: "local", subnet: "172.17.0.0/16", gateway: "172.17.0.1", containers: 2, ipam: "default", attachable: false, internal: false },
  { name: "host", driver: "host", scope: "local", subnet: "—", gateway: "—", containers: 0, ipam: "default", attachable: false, internal: false },
  { name: "none", driver: "null", scope: "local", subnet: "—", gateway: "—", containers: 0, ipam: "default", attachable: false, internal: false },
  { name: "monitoring", driver: "bridge", scope: "local", subnet: "10.40.0.0/24", gateway: "10.40.0.1", containers: 3, ipam: "default", attachable: true, internal: true },
];

const DATABASES = [
  { name: "coolify_pg", engine: "postgres", version: "15.6", host: "coolify-db", port: 5432, size: "486 MB", conns: 12, maxConns: 100, qps: 142, slow: 0, state: "ok" },
  { name: "app_main", engine: "postgres", version: "15.6", host: "coolify-db", port: 5432, size: "2.1 GB", conns: 28, maxConns: 100, qps: 380, slow: 2, state: "ok" },
  { name: "cache", engine: "redis", version: "7.2.4", host: "coolify-redis", port: 6379, size: "108 MB", conns: 18, maxConns: 200, qps: 1924, slow: 0, state: "ok" },
  { name: "queue", engine: "redis", version: "7.2.4", host: "coolify-redis", port: 6379, size: "42 MB", conns: 4, maxConns: 200, qps: 481, slow: 0, state: "ok" },
  { name: "analytics", engine: "clickhouse", version: "24.3", host: "ext-clickhouse-01", port: 8123, size: "12.4 GB", conns: 6, maxConns: 50, qps: 38, slow: 1, state: "warn" },
  { name: "legacy_mysql", engine: "mysql", version: "8.0.39", host: "ext-mysql-legacy", port: 3306, size: "884 MB", conns: 2, maxConns: 100, qps: 4, slow: 0, state: "ok" },
];

const SCANS = [
  { id: "scan_92a1f", image: "minio/minio:RELEASE.2025-04-12", scanner: "Trivy", started: "May 19, 5:12 AM", duration: "42s", status: "done", crit: 1, high: 3, med: 7, low: 14 },
  { id: "scan_8721a", image: "traefik:v3.6", scanner: "Trivy", started: "May 19, 5:11 AM", duration: "18s", status: "done", crit: 0, high: 1, med: 4, low: 12 },
  { id: "scan_771ab", image: "postgres:15-alpine", scanner: "Trivy", started: "May 19, 5:10 AM", duration: "22s", status: "done", crit: 0, high: 0, med: 2, low: 6 },
  { id: "scan_6612c", image: "ghcr.io/myorg/api:v0.3.0", scanner: "Trivy", started: "May 18, 11:02 PM", duration: "31s", status: "done", crit: 2, high: 5, med: 11, low: 18 },
  { id: "scan_5511b", image: "ghcr.io/myorg/tg-bot:v0.4.2", scanner: "Grype", started: "May 18, 10:48 PM", duration: "24s", status: "done", crit: 0, high: 0, med: 3, low: 9 },
  { id: "scan_4499f", image: "redis:7-alpine", scanner: "Trivy", started: "May 18, 8:18 PM", duration: "12s", status: "done", crit: 0, high: 0, med: 1, low: 3 },
  { id: "scan_3388e", image: "ghcr.io/coollabsio/coolify-realtime:1.0.10", scanner: "Trivy", started: "May 18, 8:18 PM", duration: "19s", status: "done", crit: 0, high: 2, med: 5, low: 8 },
  { id: "scan_2299d", image: "ghcr.io/coollabsio/sentinel:0.0.21", scanner: "Grype", started: "May 18, 8:17 PM", duration: "16s", status: "done", crit: 0, high: 0, med: 0, low: 2 },
  { id: "scan_1188c", image: "node:20-bookworm-slim", scanner: "Trivy", started: "May 17, 4:01 PM", duration: "21s", status: "done", crit: 0, high: 1, med: 3, low: 7 },
  { id: "scan_0099b", image: "k6io/k6:0.50", scanner: "Trivy", started: "May 17, 3:48 PM", duration: "14s", status: "failed", crit: 0, high: 0, med: 0, low: 0 },
];

const SBOMS = [
  { image: "minio/minio:RELEASE.2025-04-12", format: "SPDX 2.3", packages: 248, generated: "May 19, 5:12 AM", licenses: 14, ecosystem: { go: 198, npm: 0, deb: 38, other: 12 } },
  { image: "traefik:v3.6", format: "CycloneDX 1.5", packages: 184, generated: "May 19, 5:11 AM", licenses: 11, ecosystem: { go: 152, npm: 0, deb: 24, other: 8 } },
  { image: "postgres:15-alpine", format: "SPDX 2.3", packages: 96, generated: "May 19, 5:10 AM", licenses: 7, ecosystem: { go: 0, npm: 0, deb: 0, other: 96 } },
  { image: "ghcr.io/myorg/api:v0.3.0", format: "CycloneDX 1.5", packages: 412, generated: "May 18, 11:02 PM", licenses: 22, ecosystem: { go: 0, npm: 318, deb: 64, other: 30 } },
  { image: "ghcr.io/myorg/tg-bot:v0.4.2", format: "SPDX 2.3", packages: 198, generated: "May 18, 10:48 PM", licenses: 12, ecosystem: { go: 0, npm: 142, deb: 38, other: 18 } },
  { image: "redis:7-alpine", format: "CycloneDX 1.5", packages: 64, generated: "May 18, 8:18 PM", licenses: 6, ecosystem: { go: 0, npm: 0, deb: 0, other: 64 } },
  { image: "ghcr.io/coollabsio/coolify-realtime:1.0.10", format: "SPDX 2.3", packages: 224, generated: "May 18, 8:18 PM", licenses: 14, ecosystem: { go: 0, npm: 188, deb: 24, other: 12 } },
  { image: "node:20-bookworm-slim", format: "CycloneDX 1.5", packages: 142, generated: "May 17, 4:01 PM", licenses: 9, ecosystem: { go: 0, npm: 0, deb: 124, other: 18 } },
];

const ALERTS = [
  { sev: "warn", title: "Container restarted unexpectedly", target: "minio-store", time: "11 min ago", rule: "container.restart > 0 in 5m", state: "firing" },
  { sev: "bad",  title: "Disk space below threshold on /var/lib/docker", target: "production-01", time: "1h 22m ago", rule: "disk.used_pct > 80%", state: "firing" },
  { sev: "warn", title: "High CPU on coolify-db (sustained 5m)", target: "coolify-db", time: "2h ago", rule: "container.cpu > 75% for 5m", state: "resolved" },
  { sev: "info", title: "New image pulled", target: "minio/minio:RELEASE.2025-04-12", time: "3h 14m ago", rule: "image.pull.success", state: "ack" },
  { sev: "bad",  title: "Critical vulnerability detected in scan", target: "ghcr.io/myorg/api:v0.3.0", time: "6h ago", rule: "scan.severity = CRITICAL", state: "firing" },
  { sev: "warn", title: "SSL certificate expires in 14 days", target: "*.helm.dev", time: "8h ago", rule: "cert.expires_in < 30d", state: "ack" },
  { sev: "info", title: "SBOM generated", target: "traefik:v3.6", time: "12h ago", rule: "sbom.generate.success", state: "resolved" },
  { sev: "ok",   title: "Backup completed (coolify_pg)", target: "coolify-db", time: "16h ago", rule: "backup.success", state: "resolved" },
  { sev: "bad",  title: "Container OOM killed", target: "perftest-runner", time: "1d ago", rule: "container.oom = true", state: "resolved" },
  { sev: "warn", title: "Slow query detected (>500ms)", target: "analytics", time: "1d 4h ago", rule: "db.slow_query > 0", state: "ack" },
];

const ALERT_RULES = [
  { name: "CPU saturation", expr: "host.cpu > 90% for 5m", channels: ["email", "slack"], enabled: true, sev: "warn" },
  { name: "Memory pressure", expr: "host.mem > 92% for 3m", channels: ["slack", "pagerduty"], enabled: true, sev: "bad" },
  { name: "Disk fill", expr: "host.disk.used > 85%", channels: ["email", "slack"], enabled: true, sev: "warn" },
  { name: "Container restart loop", expr: "container.restart > 3 in 5m", channels: ["slack"], enabled: true, sev: "bad" },
  { name: "OOM kill", expr: "container.oom = true", channels: ["slack", "pagerduty"], enabled: true, sev: "bad" },
  { name: "Critical CVE", expr: "scan.severity = CRITICAL", channels: ["email", "slack"], enabled: true, sev: "bad" },
  { name: "SSL expiry", expr: "cert.expires_in < 30d", channels: ["email"], enabled: true, sev: "warn" },
  { name: "Backup failure", expr: "backup.status = failed", channels: ["pagerduty"], enabled: false, sev: "bad" },
];

window.HELM_DATA = { HOST, SPARKS, CONTAINERS, PROCESSES, IMAGES, NETWORKS, DATABASES, SCANS, SBOMS, ALERTS, ALERT_RULES };
})();
