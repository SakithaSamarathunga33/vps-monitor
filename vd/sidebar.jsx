/* Sidebar + Topbar for Helm */

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { id: "containers", label: "Containers", icon: "containers", badge: "10" },
      { id: "stats",      label: "Stats",      icon: "stats" },
      { id: "processes",  label: "Processes",  icon: "processes" },
    ],
  },
  {
    label: "Resources",
    items: [
      { id: "images",    label: "Images",    icon: "images", badge: "10" },
      { id: "networks",  label: "Networks",  icon: "networks", badge: "5" },
      { id: "databases", label: "Databases", icon: "databases", badge: "6" },
    ],
  },
  {
    label: "Security",
    items: [
      { id: "scans",  label: "Scan History", icon: "scans" },
      { id: "sboms",  label: "SBOMs",        icon: "sboms" },
      { id: "alerts", label: "Alerts",       icon: "alerts", badge: "3", alert: true },
    ],
  },
];

function HelmMark({ size = 14 }) {
  // Custom geometric mark — angular bracket with notch
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 6L12 3L19 6V18L12 21L5 18V6Z" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="0.95"/>
      <path d="M9 10L12 8L15 10V14L12 16L9 14V10Z" fill="white" opacity="0.95"/>
    </svg>
  );
}

function Sidebar({ active, setActive }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand-mark"><HelmMark size={14}/></div>
        <div style={{display:"flex", flexDirection:"column", gap:1}}>
          <div className="brand-name">helm<span className="dot">.</span></div>
          <div className="brand-meta">vps · console</div>
        </div>
      </div>

      <div className="sidebar-nav">
        {NAV_SECTIONS.map((sec) => (
          <div key={sec.label}>
            <div className="nav-section-label">{sec.label}</div>
            {sec.items.map((it) => (
              <div
                key={it.id}
                className={`nav-item ${active === it.id ? "active" : ""} ${it.alert ? "has-alert" : ""}`}
                onClick={() => setActive(it.id)}
              >
                <span className="nav-ico"><Icon name={it.icon} size={16}/></span>
                <span>{it.label}</span>
                {it.badge && <span className="nav-badge">{it.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="host-card">
          <div className="host-dot"/>
          <div style={{display:"flex", flexDirection:"column", minWidth:0, flex:1}}>
            <div className="host-name">production-01</div>
            <div className="host-info">162.55.214.86 · HEL1</div>
          </div>
          <Icon name="cright" size={12}/>
        </div>
      </div>
    </aside>
  );
}

const PAGE_TITLES = {
  containers: "Containers",
  stats: "System Stats",
  processes: "Processes",
  images: "Images",
  networks: "Networks",
  databases: "Databases",
  scans: "Scan History",
  sboms: "SBOMs",
  alerts: "Alerts",
};

function Topbar({ active, theme, setTheme }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>production-01</span>
        <span className="sep">/</span>
        <span className="here">{PAGE_TITLES[active]}</span>
      </div>

      <div className="search">
        <span className="s-ico"><Icon name="search" size={14}/></span>
        <input placeholder="Search containers, images, processes…" />
        <span className="s-kbd">⌘K</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" title="Refresh"><Icon name="refresh" size={15}/></button>
        <button className="icon-btn has-dot" title="Alerts"><Icon name="bell" size={15}/></button>
        <button className="icon-btn" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Icon name={theme === "dark" ? "sun" : "moon"} size={15}/>
        </button>
        <button className="icon-btn" title="Settings"><Icon name="settings" size={15}/></button>
        <div className="avatar">SS</div>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, PAGE_TITLES });
