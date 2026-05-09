export interface DockerHost {
  Name: string
  Host: string
}

export interface ContainerInfo {
  id: string
  names: string[]
  image: string
  image_id: string
  command: string
  created: number
  state: string
  status: string
  labels?: Record<string, string>
  host: string
  runtime?: "docker" | "pm2"
  pm2?: {
    id: number
    pid: number
    namespace?: string
    script_path?: string
    cwd?: string
    interpreter?: string
    restart_count: number
    cpu_percent: number
    memory_bytes: number
  }
  historical_stats?: {
    cpu_1h: number
    memory_1h: number
    cpu_12h: number
    memory_12h: number
  }
}

export interface ContainersQueryParams {
  search?: string
  state?: string
  sortCreated?: "asc" | "desc"
  sortBy?: "name" | "state" | "uptime" | "created" | "cpu" | "ram"
  groupBy?: "none" | "compose"
  host?: string
}
