/* Helm — main app */

const { useState, useEffect, useRef } = React;

function ThemeProvider({ children, theme }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return children;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#8b7cff",
  "density": "comfortable",
  "showSidebarMeta": true
}/*EDITMODE-END*/;

function App() {
  const initial = (typeof window !== "undefined" && window.location.hash) ? window.location.hash.slice(1) : "containers";
  const [active, setActive] = useState(initial);
  const [theme, setTheme] = useState(() => localStorage.getItem("helm-theme") || "dark");
  const pageRef = useRef(null);

  // tweaks
  const tweaksHook = (window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}]);
  const t = tweaksHook[0], setTweak = tweaksHook[1];
  const TweaksPanel = window.TweaksPanel;
  const TweakSection = window.TweakSection;
  const TweakColor = window.TweakColor;
  const TweakRadio = window.TweakRadio;
  const TweakToggle = window.TweakToggle;

  useEffect(() => {
    localStorage.setItem("helm-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.history.replaceState(null, "", "#" + active);
  }, [active]);

  // Apply tweaked accent
  useEffect(() => {
    if (t.accent) {
      const c = t.accent;
      // derive a slightly darker shade for hover
      document.documentElement.style.setProperty("--acc", c);
      // soft glow uses accent with alpha — we just set the main two
      const hex = c.replace("#","");
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
      document.documentElement.style.setProperty("--acc-soft", `rgba(${r}, ${g}, ${b}, 0.14)`);
      document.documentElement.style.setProperty("--acc-soft-2", `rgba(${r}, ${g}, ${b}, 0.08)`);
      document.documentElement.style.setProperty("--acc-border", `rgba(${r}, ${g}, ${b}, 0.32)`);
    }
  }, [t.accent]);

  // GSAP entrance on page change
  useEffect(() => {
    if (!window.gsap) return;
    const nodes = document.querySelectorAll(".gsap-enter");
    if (!nodes.length) return;
    window.gsap.fromTo(nodes,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.06 }
    );
  }, [active]);

  const Page = {
    containers: window.ContainersPage,
    stats: window.StatsPage,
    processes: window.ProcessesPage,
    images: window.ImagesPage,
    networks: window.NetworksPage,
    databases: window.DatabasesPage,
    scans: window.ScansPage,
    sboms: window.SBOMsPage,
    alerts: window.AlertsPage,
  }[active] || window.ContainersPage;

  return (
    <ThemeProvider theme={theme}>
      <div className="app" data-screen-label={`Helm · ${window.PAGE_TITLES[active]}`}>
        <Sidebar active={active} setActive={setActive} />
        <div className="main">
          <Topbar active={active} theme={theme} setTheme={setTheme}/>
          <div ref={pageRef} key={active}>
            <Page />
          </div>
        </div>

        {TweaksPanel && (
          <TweaksPanel title="Tweaks">
            <TweakSection title="Theme">
              <TweakRadio
                label="Mode"
                value={theme}
                onChange={(v) => setTheme(v)}
                options={[{label:"Dark", value:"dark"},{label:"Light", value:"light"}]}
              />
              <TweakColor
                label="Accent"
                value={t.accent}
                onChange={(v) => setTweak("accent", v)}
                options={["#8b7cff","#22c55e","#06b6d4","#ec4899","#f97316","#eaeaea"]}
              />
            </TweakSection>
            <TweakSection title="Logo">
              <div style={{fontSize:12, color:"var(--fg-3)", lineHeight:1.5}}>
                Proposed wordmark <span className="code">helm.</span> — short, devops-flavoured, ownable. Mark is a stylized hexagonal helm. Toggle the theme or accent above to preview both modes.
              </div>
            </TweakSection>
          </TweaksPanel>
        )}
      </div>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
