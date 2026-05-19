/* Containers + Stats + Processes pages */

const { HOST, SPARKS, CONTAINERS, PROCESSES } = window.HELM_DATA;

/* ===================================================================
   Containers page
   =================================================================== */
function ContainersPage() {
  const [tab, setTab] = React.useState("running");
  const [selected, setSelected] = React.useState(new Set());
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    return CONTAINERS.filter(c => {
      if (tab === "all") return true;
      return c.state === tab;
    }).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.img.toLowerCase().includes(search.toLowerCase()));
  }, [tab, search]);

  const counts = {
    all: CONTAINERS.length,
    running: CONTAINERS.filter(c => c.state === "running").length,
    stopped: CONTAINERS.filter(c => c.state === "stopped").length,
    exited: CONTAINERS.filter(c => c.state === "exited").length,
  };

  const toggle = (name) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    setSelected(next);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Containers</h1>
          <div className="page-sub">10 containers · 8 running · 2 stopped · last scan 12 min ago</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="refresh" size={13}/> Refresh</button>
          <button className="btn"><Icon name="filter" size={13}/> Filters</button>
          <button className="btn primary"><Icon name="plus" size={13}/> New container</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid-4 gsap-enter">
        <StatCard
          label="Host" value={<span style={{fontFamily:"var(--font-sans)", fontSize:17, fontWeight:600, letterSpacing:"-0.01em"}}>{HOST.name}</span>}
          sub={<><span className="code">{HOST.distro}</span><span className="code">kernel {HOST.kernel.split("-")[0]}</span></>}
          icon="globe" accent
        />
        <StatCard
          label="Apps" value={HOST.apps} unit="containers"
          sub={<><Pill tone="ok">8 running</Pill><Pill tone="outline">2 stopped</Pill></>}
          icon="containers"
        />
        <StatCard
          label="CPU" value={HOST.cpu.usage} unit="%"
          sub={<>{HOST.cpu.cores} cores · avg 23%</>}
          icon="cpu" spark={SPARKS.cpu} delta="+2.1" deltaTone="up" tone="acc"
        />
        <StatCard
          label="Memory" value={HOST.memory.pct} unit="%"
          sub={<>{HOST.memory.used} / {HOST.memory.total} {HOST.memory.unit}</>}
          icon="mem" spark={SPARKS.mem} delta="−1.4" deltaTone="down" tone="warn"
        />
      </div>

      {/* Disk + network strip */}
      <div className="card mt-3 gsap-enter">
        <div style={{padding:"14px 18px", display:"grid", gridTemplateColumns:"minmax(180px,1fr) minmax(220px,1.4fr) minmax(220px,1.4fr)", gap:24, alignItems:"center"}}>
          <div style={{minWidth:0}}>
            <div className="stat-label"><Icon name="disk" size={12}/> Disk Usage</div>
            <div style={{display:"flex", alignItems:"baseline", gap:8, marginTop:6, whiteSpace:"nowrap"}}>
              <div className="tabular" style={{fontFamily:"var(--font-mono)", fontSize:22, fontWeight:600}}>26<span style={{fontSize:13, color:"var(--fg-3)"}}>%</span></div>
              <div style={{color:"var(--fg-3)", fontSize:11, fontFamily:"var(--font-mono)", overflow:"hidden", textOverflow:"ellipsis"}}>19 / 75 GB · 56 GB free</div>
            </div>
            <Bar value={26} tone="ok" />
          </div>
          <div style={{minWidth:0}}>
            <div className="stat-label"><Icon name="net" size={12}/> Network · last 60s</div>
            <div style={{display:"flex", alignItems:"baseline", gap:14, marginTop:6, whiteSpace:"nowrap"}}>
              <div className="tabular" style={{fontFamily:"var(--font-mono)", fontSize:14}}>
                <span style={{color:"var(--ok)"}}>↓ 384</span><span style={{color:"var(--fg-3)", fontSize:11}}> KB/s</span>
              </div>
              <div className="tabular" style={{fontFamily:"var(--font-mono)", fontSize:14}}>
                <span style={{color:"var(--info)"}}>↑ 92</span><span style={{color:"var(--fg-3)", fontSize:11}}> KB/s</span>
              </div>
            </div>
            <div style={{marginTop:6}}><Sparkline data={SPARKS.net} width={280} height={26} color="var(--ok)" area="var(--ok-soft)"/></div>
          </div>
          <div style={{minWidth:0}}>
            <div className="stat-label"><Icon name="activity" size={12}/> Load Avg · 1m 5m 15m</div>
            <div style={{display:"flex", alignItems:"baseline", gap:10, marginTop:6, fontFamily:"var(--font-mono)", fontSize:16, whiteSpace:"nowrap"}}>
              <span>{HOST.load[0].toFixed(2)}</span>
              <span style={{color:"var(--fg-3)"}}>{HOST.load[1].toFixed(2)}</span>
              <span style={{color:"var(--fg-4)"}}>{HOST.load[2].toFixed(2)}</span>
              <span className="delta up" style={{marginLeft:"auto"}}><Icon name="arrow_up" size={10}/> 0.03</span>
            </div>
            <div style={{marginTop:6}}><Sparkline data={SPARKS.load} width={280} height={26} color="var(--acc)" area="var(--acc-soft)"/></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mt-4">
        <div className={`tab ${tab==="all"?"active":""}`} onClick={() => setTab("all")}>All<span className="count">{counts.all}</span></div>
        <div className={`tab ${tab==="running"?"active":""}`} onClick={() => setTab("running")}><span style={{color:"var(--ok)"}}>●</span> Running<span className="count">{counts.running}</span></div>
        <div className={`tab ${tab==="stopped"?"active":""}`} onClick={() => setTab("stopped")}><span style={{color:"var(--fg-4)"}}>●</span> Stopped<span className="count">{counts.stopped}</span></div>
        <div className={`tab ${tab==="exited"?"active":""}`} onClick={() => setTab("exited")}><span style={{color:"var(--bad)"}}>●</span> Exited<span className="count">{counts.exited}</span></div>
      </div>

      {/* Filter row */}
      <div className="filters gsap-enter">
        <div className="search" style={{width: 260, marginLeft: 0}}>
          <span className="s-ico"><Icon name="search" size={13}/></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter…"/>
        </div>
        <FilterChip label="Host" value="All hosts" />
        <FilterChip label="Sort" value="Created" />
        <FilterChip label="Group" value="None" />
        <div className="btn-group" style={{marginLeft:"auto"}}>
          <button className="btn active">1h</button>
          <button className="btn">12h</button>
          <button className="btn">24h</button>
          <button className="btn">7d</button>
        </div>
        <button className="btn"><Icon name="cal" size={13}/> Date range</button>
        <button className="icon-btn" title="View"><Icon name="layout" size={14}/></button>
        <button className="icon-btn" title="Settings"><Icon name="settings" size={14}/></button>
      </div>

      {/* Container table */}
      <div className="card gsap-enter">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:36}}><div className="chk"/></th>
                <th>Name</th>
                <th>Image</th>
                <th>State</th>
                <th>Uptime</th>
                <th>Ports</th>
                <th className="right">CPU 1h</th>
                <th className="right">RAM 1h</th>
                <th>Created</th>
                <th className="right" style={{width:200}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.name} className={selected.has(c.name) ? "selected" : ""}>
                  <td><div className={`chk ${selected.has(c.name) ? "on" : ""}`} onClick={() => toggle(c.name)}/></td>
                  <td>
                    <div style={{display:"flex", flexDirection:"column", minWidth:0}}>
                      <div style={{fontWeight:500, fontSize:13, display:"flex", alignItems:"center", gap:8}}>
                        <span style={{maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{c.name}</span>
                      </div>
                      <div style={{display:"flex", gap:4, marginTop:2}}>
                        <span className="pill outline" style={{fontSize:9, padding:"0 5px"}}>docker</span>
                        {c.ports !== "—" && <span className="pill outline" style={{fontSize:9, padding:"0 5px"}}>:{c.ports.split("/")[0]}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="mono dim" style={{maxWidth:280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{c.img}</td>
                  <td>
                    {c.state === "running" && <Pill tone="ok">Running</Pill>}
                    {c.state === "stopped" && <Pill tone="outline">Stopped</Pill>}
                    {c.state === "exited" && <Pill tone="bad">Exited</Pill>}
                  </td>
                  <td className="mono">{c.uptime}</td>
                  <td className="mono dim" style={{fontSize:11}}>{c.ports}</td>
                  <td className="right">
                    <div style={{display:"inline-flex", alignItems:"center", gap:8, justifyContent:"flex-end"}}>
                      <Sparkline data={SPARKS.cpu.slice(i*3, i*3+30).length ? SPARKS.cpu.slice(i*3, i*3+30) : SPARKS.cpu.slice(0,30)} width={48} height={16} strokeWidth={1.2}/>
                      <span className="mono tabular">{c.cpu.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="right">
                    <div style={{display:"inline-flex", alignItems:"center", gap:8, justifyContent:"flex-end"}}>
                      <Sparkline data={SPARKS.mem.slice(i*4, i*4+30).length ? SPARKS.mem.slice(i*4, i*4+30) : SPARKS.mem.slice(0,30)} width={48} height={16} color="var(--warn)" area="var(--warn-soft)" strokeWidth={1.2}/>
                      <span className="mono tabular">{c.ram.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="mono dim" style={{fontSize:11}}>{c.created}</td>
                  <td>
                    <div className="actions">
                      <ActionBtn icon="stop" title="Stop"/>
                      <ActionBtn icon="restart" title="Restart"/>
                      <ActionBtn icon="logs" title="Logs"/>
                      <ActionBtn icon="terminal" title="Shell"/>
                      <ActionBtn icon="activity" title="Stats"/>
                      <ActionBtn icon="trash" title="Remove" tone="danger"/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{display:"flex", alignItems:"center", padding:"12px 4px", color:"var(--fg-3)", fontSize:12}}>
        <div>Showing <span className="mono">{filtered.length}</span> of <span className="mono">{CONTAINERS.length}</span> containers</div>
        <div style={{marginLeft:"auto", display:"flex", gap:8, alignItems:"center"}}>
          <span className="live">Live polling · 5s</span>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   Stats page
   =================================================================== */
function StatsPage() {
  const charts = [
    { label: "CPU", icon: "cpu", v: HOST.cpu.usage, unit: "%", data: SPARKS.cpuLong, color: "var(--acc)", area: "var(--acc-soft)", sub: "4 cores · avg 23% · peak 64%" },
    { label: "Memory", icon: "mem", v: HOST.memory.pct, unit: "%", data: SPARKS.memLong, color: "var(--warn)", area: "var(--warn-soft)", sub: "1.5 / 3.7 GB · 0.2 GB swap" },
    { label: "Disk I/O", icon: "disk", v: 48, unit: " MB/s", data: SPARKS.io, color: "var(--info)", area: "var(--info-soft)", sub: "read 28 MB/s · write 20 MB/s", yMax: 100, yT: [0,25,50,75,100] },
    { label: "Network", icon: "net", v: 476, unit: " KB/s", data: SPARKS.net, color: "var(--ok)", area: "var(--ok-soft)", sub: "rx 384 · tx 92 KB/s", yMax: 100, yT: [0,25,50,75,100] },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">System Stats</h1>
          <div className="page-sub">Real-time host metrics · production-01 · {HOST.region}</div>
        </div>
        <div className="page-actions">
          <div className="btn-group">
            <button className="btn">5m</button>
            <button className="btn">1h</button>
            <button className="btn active">6h</button>
            <button className="btn">24h</button>
            <button className="btn">7d</button>
          </div>
          <button className="btn"><Icon name="download" size={13}/> Export</button>
          <button className="btn"><Icon name="refresh" size={13}/> Auto · 5s</button>
        </div>
      </div>

      {/* Top: 4 mini stat cards */}
      <div className="grid-4 gsap-enter">
        <StatCard label="CPU" icon="cpu" value={HOST.cpu.usage} unit="%" sub={<>peak <span className="mono">64%</span></>} spark={SPARKS.cpu} delta="+2.1" tone="acc" accent />
        <StatCard label="Memory" icon="mem" value={HOST.memory.pct} unit="%" sub={<>{HOST.memory.used}/{HOST.memory.total} GB</>} spark={SPARKS.mem} delta="−1.4" deltaTone="down" tone="warn" />
        <StatCard label="Disk" icon="disk" value={26} unit="%" sub={<>read 28 · write 20 MB/s</>} spark={SPARKS.io} delta="+0.0" deltaTone="flat" tone="info" />
        <StatCard label="Network" icon="net" value={476} unit=" KB/s" sub={<>↓ 384 · ↑ 92</>} spark={SPARKS.net} delta="+18%" tone="ok" />
      </div>

      {/* Main charts */}
      <div className="grid-2 mt-3 gsap-enter">
        {charts.map((c, i) => (
          <div key={i} className="card">
            <CardHead title={c.label.toUpperCase()} icon={c.icon} live={i<2} right={
              <>
                <span className="mono tabular" style={{fontSize:18, fontWeight:600}}>{c.v}<span style={{color:"var(--fg-3)", fontSize:12, fontWeight:500}}>{c.unit}</span></span>
                <button className="icon-btn"><Icon name="more" size={14}/></button>
              </>
            }/>
            <div style={{padding:"10px 12px 12px"}}>
              <LineChart series={c.data} height={180} color={c.color} area={c.area} yMax={c.yMax || 100} yTicks={c.yT || [0,25,50,75,100]} unit={c.unit.includes("%") ? "%" : ""}
                xTicks={["−6h","−4h","−2h","−1h","now"]}/>
              <div style={{display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>
                <span>{c.sub}</span>
                <span>avg <span style={{color:"var(--fg)"}}>{(c.data.reduce((a,b)=>a+b,0)/c.data.length).toFixed(1)}</span> · max <span style={{color:"var(--fg)"}}>{Math.max(...c.data).toFixed(1)}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Host details */}
      <div className="grid-3 mt-3 gsap-enter">
        <div className="card">
          <CardHead title="HOST" icon="globe"/>
          <div className="card-pad-lg">
            <dl className="kv">
              <dt>Hostname</dt><dd>{HOST.name}</dd>
              <dt>OS</dt><dd>{HOST.distro}</dd>
              <dt>Kernel</dt><dd>{HOST.kernel}</dd>
              <dt>Uptime</dt><dd>{HOST.uptime}</dd>
              <dt>IP</dt><dd>{HOST.ip}</dd>
              <dt>Region</dt><dd>{HOST.region}</dd>
              <dt>CPU</dt><dd style={{fontSize:11}}>{HOST.cpu.model}</dd>
              <dt>Cores</dt><dd>{HOST.cpu.cores}</dd>
            </dl>
          </div>
        </div>

        <div className="card">
          <CardHead title="MEMORY BREAKDOWN" icon="mem"/>
          <div className="card-pad-lg">
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:12}}>
              <span style={{color:"var(--fg-3)"}}>Total · <span style={{color:"var(--fg)", fontFamily:"var(--font-mono)"}}>3.7 GB</span></span>
              <span className="mono tabular" style={{color:"var(--fg-3)"}}>used 1.5 GB</span>
            </div>
            <div className="bar seg" style={{height:10}}>
              <span style={{width:"22%", background:"var(--acc)"}}/>
              <span style={{width:"12%", background:"var(--info)"}}/>
              <span style={{width:"6%", background:"var(--warn)"}}/>
              <span style={{width:"60%", background:"var(--bg-3)"}}/>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14, fontSize:12}}>
              <div style={{display:"flex", alignItems:"center", gap:6}}><span style={{width:8, height:8, background:"var(--acc)", borderRadius:2}}/><span style={{color:"var(--fg-3)"}}>App</span><span className="mono tabular" style={{marginLeft:"auto"}}>0.82 GB</span></div>
              <div style={{display:"flex", alignItems:"center", gap:6}}><span style={{width:8, height:8, background:"var(--info)", borderRadius:2}}/><span style={{color:"var(--fg-3)"}}>Cache</span><span className="mono tabular" style={{marginLeft:"auto"}}>0.44 GB</span></div>
              <div style={{display:"flex", alignItems:"center", gap:6}}><span style={{width:8, height:8, background:"var(--warn)", borderRadius:2}}/><span style={{color:"var(--fg-3)"}}>Buffers</span><span className="mono tabular" style={{marginLeft:"auto"}}>0.22 GB</span></div>
              <div style={{display:"flex", alignItems:"center", gap:6}}><span style={{width:8, height:8, background:"var(--bg-3)", borderRadius:2}}/><span style={{color:"var(--fg-3)"}}>Free</span><span className="mono tabular" style={{marginLeft:"auto"}}>2.22 GB</span></div>
            </div>
            <div className="divider"/>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}>
              <span style={{color:"var(--fg-3)"}}>Swap</span>
              <span className="mono tabular">0.2 / 2.0 GB · 10%</span>
            </div>
            <Bar value={10} tone="info"/>
          </div>
        </div>

        <div className="card">
          <CardHead title="DISK · /var/lib/docker" icon="disk"/>
          <div className="card-pad-lg">
            <div style={{display:"flex", alignItems:"baseline", gap:8, marginBottom:6}}>
              <span className="mono tabular" style={{fontSize:24, fontWeight:600}}>26<span style={{fontSize:13, color:"var(--fg-3)"}}>%</span></span>
              <span style={{color:"var(--fg-3)", fontSize:11, fontFamily:"var(--font-mono)"}}>19 GB used · 56 GB free</span>
            </div>
            <Bar value={26} tone="ok"/>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14, fontSize:12}}>
              <div><div style={{color:"var(--fg-3)", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em"}}>Images</div><div className="mono tabular" style={{fontSize:14, fontWeight:600}}>11.2 GB</div></div>
              <div><div style={{color:"var(--fg-3)", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em"}}>Volumes</div><div className="mono tabular" style={{fontSize:14, fontWeight:600}}>5.8 GB</div></div>
              <div><div style={{color:"var(--fg-3)", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em"}}>Containers</div><div className="mono tabular" style={{fontSize:14, fontWeight:600}}>1.4 GB</div></div>
              <div><div style={{color:"var(--fg-3)", fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em"}}>Build cache</div><div className="mono tabular" style={{fontSize:14, fontWeight:600}}>0.6 GB</div></div>
            </div>
            <div className="divider"/>
            <button className="btn" style={{width:"100%", justifyContent:"center"}}><Icon name="trash" size={12}/> Clear build cache</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   Processes page (htop-ish)
   =================================================================== */
function ProcessesPage() {
  const [sortBy, setSortBy] = React.useState("cpu");
  const sorted = React.useMemo(() => [...PROCESSES].sort((a,b) => b[sortBy] - a[sortBy]), [sortBy]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Processes</h1>
          <div className="page-sub">{PROCESSES.length} processes · sorted by {sortBy} · sampling every 1s</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="filter" size={13}/> Threads</button>
          <button className="btn"><Icon name="user" size={13}/> All users</button>
          <button className="btn primary"><Icon name="refresh" size={13}/> Live</button>
        </div>
      </div>

      {/* Mini CPU strip per core */}
      <div className="card gsap-enter">
        <div style={{padding:"12px 16px", display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:18, alignItems:"center"}}>
          {[1,2,3,4].map(n => {
            const v = [22, 18, 31, 14][n-1];
            return (
              <div key={n}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>
                  <span>CPU{n}</span><span className="tabular">{v}%</span>
                </div>
                <Bar value={v} tone={v > 80 ? "bad" : v > 60 ? "warn" : "ok"}/>
              </div>
            );
          })}
        </div>
      </div>

      <div className="filters mt-3 gsap-enter">
        <div className="search" style={{width: 240, marginLeft:0}}>
          <span className="s-ico"><Icon name="search" size={13}/></span>
          <input placeholder="Filter by command, user, PID…"/>
        </div>
        <FilterChip label="User" value="All" />
        <FilterChip label="State" value="All" />
        <div className="btn-group" style={{marginLeft:"auto"}}>
          <button className={`btn ${sortBy==="cpu"?"active":""}`} onClick={() => setSortBy("cpu")}>CPU</button>
          <button className={`btn ${sortBy==="mem"?"active":""}`} onClick={() => setSortBy("mem")}>Memory</button>
          <button className={`btn ${sortBy==="pid"?"active":""}`} onClick={() => setSortBy("pid")}>PID</button>
        </div>
      </div>

      <div className="card gsap-enter">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>PID</th>
                <th>User</th>
                <th>Command</th>
                <th>State</th>
                <th className="right">CPU%</th>
                <th className="right">MEM%</th>
                <th className="right">VIRT</th>
                <th className="right">RES</th>
                <th className="right">TIME+</th>
                <th style={{width:60}}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => (
                <tr key={p.pid}>
                  <td className="mono tabular">{p.pid}</td>
                  <td className="mono dim">{p.user}</td>
                  <td className="mono" style={{fontSize:12, maxWidth:380, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.cmd}</td>
                  <td><Pill tone={p.state === "R" ? "ok" : "outline"}>{p.state === "S" ? "sleep" : p.state === "R" ? "running" : p.state}</Pill></td>
                  <td className="right">
                    <div style={{display:"inline-flex", alignItems:"center", gap:8, minWidth:120, justifyContent:"flex-end"}}>
                      <div style={{width:60}}><Bar value={p.cpu} tone={p.cpu > 80 ? "bad" : p.cpu > 50 ? "warn" : ""}/></div>
                      <span className="mono tabular">{p.cpu.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="right">
                    <div style={{display:"inline-flex", alignItems:"center", gap:8, minWidth:120, justifyContent:"flex-end"}}>
                      <div style={{width:60}}><Bar value={p.mem} tone="info"/></div>
                      <span className="mono tabular">{p.mem.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="right mono dim tabular">{p.virt}</td>
                  <td className="right mono tabular">{p.res}</td>
                  <td className="right mono dim tabular">{p.time}</td>
                  <td>
                    <div className="actions">
                      <ActionBtn icon="more" title="Actions"/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ContainersPage, StatsPage, ProcessesPage });
