/* Icons + shared UI for Helm */

const ICON_PATHS = {
  // nav
  containers: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  stats: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>',
  processes: '<path d="M9 17H7a5 5 0 1 1 0-10h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>',
  images: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  networks: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v3M12 14l-5 4M12 14l5 4M9 14h6"/>',
  databases: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/>',
  scans: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18"/>',
  sboms: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h6M9 9h2"/>',
  alerts: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  // ui
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.15.66.4.88.71"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5M3 12a9 9 0 0 0 15 6.7l3-2.7M21 21v-5h-5"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  logs: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h6"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  cright: '<polyline points="9 18 15 12 9 6"/>',
  cleft: '<polyline points="15 18 9 12 15 6"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  mem: '<rect x="3" y="6" width="18" height="12" rx="1"/><line x1="7" y1="6" x2="7" y2="18"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="17" y1="6" x2="17" y2="18"/>',
  disk: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/>',
  net: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18"/>',
  arrow_up: '<polyline points="18 15 12 9 6 15"/>',
  arrow_down: '<polyline points="6 9 12 15 18 9"/>',
  arrow_right: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  warn: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  command: '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  package: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  branch: '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};

function Icon({ name, size = 16, strokeWidth = 1.75, ...rest }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
      {...rest}
    />
  );
}

/* ------------ Sparkline ------------ */
function Sparkline({ data, width = 84, height = 28, color = "var(--acc)", fill = true, area = "var(--acc-soft)", strokeWidth = 1.4 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = (max - min) || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${(i*step).toFixed(2)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(2)}`);
  const d = `M ${pts.join(" L ")}`;
  const dFill = `${d} L ${(width).toFixed(2)},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
      {fill && <path d={dFill} fill={area} />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ------------ Line chart ------------ */
function LineChart({ series, width = 600, height = 200, color = "var(--acc)", area = "var(--acc-soft)", yMax = 100, yTicks = [0, 25, 50, 75, 100], xTicks = ["−60m","−45m","−30m","−15m","now"], unit = "%" }) {
  const padL = 40, padR = 12, padT = 10, padB = 22;
  const w = width - padL - padR, h = height - padT - padB;
  const data = series;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${(padL + i*step).toFixed(2)},${(padT + h - (v / yMax) * h).toFixed(2)}`);
  const d = `M ${pts.join(" L ")}`;
  const dFill = `${d} L ${(padL + w).toFixed(2)},${padT + h} L ${padL},${padT + h} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{display:"block"}}>
      {/* y grid */}
      {yTicks.map((t,i) => (
        <g key={i}>
          <line x1={padL} x2={padL + w} y1={padT + h - (t / yMax) * h} y2={padT + h - (t / yMax) * h} stroke="var(--grid)" strokeWidth="1"/>
          <text x={padL - 6} y={padT + h - (t / yMax) * h + 3} textAnchor="end" fontSize="9" fill="var(--fg-4)" fontFamily="var(--font-mono)">{t}{unit}</text>
        </g>
      ))}
      {/* x labels */}
      {xTicks.map((t,i) => (
        <text key={i} x={padL + (w * i / (xTicks.length-1))} y={height - 6} textAnchor="middle" fontSize="9" fill="var(--fg-4)" fontFamily="var(--font-mono)">{t}</text>
      ))}
      <path d={dFill} fill={area} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {/* end-point dot */}
      <circle cx={padL + w} cy={padT + h - (data[data.length-1] / yMax) * h} r="3" fill={color} stroke="var(--card)" strokeWidth="1.5"/>
    </svg>
  );
}

/* ------------ Bar / progress ------------ */
function Bar({ value, max = 100, tone = "" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`bar ${tone}`}><i style={{ width: `${pct}%` }} /></div>
  );
}

/* ------------ Card head ------------ */
function CardHead({ title, icon, right, live }) {
  return (
    <div className="card-head">
      {icon && <Icon name={icon} size={14} />}
      <span className="card-head-title">{title}</span>
      {live && <span className="live" style={{marginLeft: 6}}>Live</span>}
      {right && <div style={{marginLeft: "auto", display:"flex", alignItems:"center", gap:6}}>{right}</div>}
    </div>
  );
}

/* ------------ Stat card ------------ */
function StatCard({ label, value, unit, sub, delta, deltaTone="up", spark, accent, icon, tone }) {
  return (
    <div className={`stat-card ${accent ? "accent" : ""}`}>
      <div className="accent-line" style={tone ? { background: `var(--${tone})` } : null} />
      <div className="stat-label">
        {icon && <Icon name={icon} size={12} />} {label}
      </div>
      <div className="stat-value tabular">
        <span>{value}</span>{unit && <span className="unit">{unit}</span>}
        {delta != null && <span className={`delta ${deltaTone}`} style={{marginLeft:"auto", alignSelf:"center"}}>
          <Icon name={deltaTone === "up" ? "arrow_up" : deltaTone === "down" ? "arrow_down" : "arrow_right"} size={10}/> {delta}
        </span>}
      </div>
      <div className="stat-foot">
        {sub && <div className="stat-sub">{sub}</div>}
        {spark && <div className="stat-spark"><Sparkline data={spark} color={tone ? `var(--${tone})` : "var(--acc)"} area={tone ? `var(--${tone}-soft)` : "var(--acc-soft)"} /></div>}
      </div>
    </div>
  );
}

/* ------------ Pill ------------ */
function Pill({ tone = "", children, dot = true }) {
  return (
    <span className={`pill ${tone}`}>
      {dot && tone && <span className="dot"/>}
      {children}
    </span>
  );
}

/* ------------ Severity badge ------------ */
function Sev({ level, count }) {
  return <span className={`sev ${level}`}>{count != null ? count : level}</span>;
}

/* ------------ Vulnerability bar (segments) ------------ */
function VulnBar({ v }) {
  const total = v.crit + v.high + v.med + v.low;
  return (
    <div className="sevbar">
      {v.crit > 0 && <span className="seg crit"><span className="sq"/>{v.crit}</span>}
      {v.high > 0 && <span className="seg high"><span className="sq"/>{v.high}</span>}
      {v.med > 0 && <span className="seg med"><span className="sq"/>{v.med}</span>}
      {v.low > 0 && <span className="seg low"><span className="sq"/>{v.low}</span>}
      {total === 0 && <span className="pill ok"><span className="dot"/>clean</span>}
    </div>
  );
}

/* ------------ Action row icons ------------ */
function ActionBtn({ icon, title, tone, onClick }) {
  return (
    <button className="icon-btn" title={title} onClick={onClick} style={tone === "danger" ? { color: "var(--bad)" } : null}>
      <Icon name={icon} size={14}/>
    </button>
  );
}

/* ------------ Filter chip ------------ */
function FilterChip({ label, value, ico = "chevron" }) {
  return (
    <button className="field">
      <span className="lbl">{label}:</span>
      <span className="v">{value}</span>
      <Icon name={ico} size={12} />
    </button>
  );
}

/* expose to window */
Object.assign(window, { Icon, Sparkline, LineChart, Bar, CardHead, StatCard, Pill, Sev, VulnBar, ActionBtn, FilterChip });
