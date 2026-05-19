/* Scan History + SBOMs + Alerts pages */

const { SCANS, SBOMS, ALERTS, ALERT_RULES, SPARKS: SPK2 } = window.HELM_DATA;

/* ===================================================================
   Scan History
   =================================================================== */
function ScansPage() {
  const totals = SCANS.reduce((a, s) => ({
    crit: a.crit + s.crit, high: a.high + s.high, med: a.med + s.med, low: a.low + s.low,
  }), { crit: 0, high: 0, med: 0, low: 0 });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Scan History</h1>
          <div className="page-sub">{SCANS.length} scans · {SCANS.filter(s=>s.status==="done").length} succeeded · {SCANS.filter(s=>s.status==="failed").length} failed</div>
        </div>
        <div className="page-actions">
          <FilterChip label="Scanner" value="All"/>
          <button className="btn primary"><Icon name="shield" size={13}/> Scan now</button>
        </div>
      </div>

      <div className="grid-4 gsap-enter">
        <StatCard label="Critical" icon="warn" value={totals.crit} sub={<>across {SCANS.filter(s=>s.crit>0).length} images</>} accent tone="bad"/>
        <StatCard label="High" icon="warn" value={totals.high} sub={<>requires patch</>} tone="warn"/>
        <StatCard label="Medium" icon="info" value={totals.med}/>
        <StatCard label="Low" icon="check" value={totals.low}/>
      </div>

      {/* Severity timeline */}
      <div className="card mt-3 gsap-enter">
        <CardHead title="VULNERABILITY TREND · 30d" icon="activity" live right={
          <div style={{display:"flex", gap:10, fontSize:11, fontFamily:"var(--font-mono)"}}>
            <span style={{display:"inline-flex", alignItems:"center", gap:4}}><span style={{width:8, height:8, background:"#ef4444", borderRadius:2}}/> critical</span>
            <span style={{display:"inline-flex", alignItems:"center", gap:4}}><span style={{width:8, height:8, background:"#f97316", borderRadius:2}}/> high</span>
            <span style={{display:"inline-flex", alignItems:"center", gap:4}}><span style={{width:8, height:8, background:"#f59e0b", borderRadius:2}}/> medium</span>
            <span style={{display:"inline-flex", alignItems:"center", gap:4}}><span style={{width:8, height:8, background:"#3b82f6", borderRadius:2}}/> low</span>
          </div>
        }/>
        <div style={{padding:"14px 16px 16px"}}>
          {/* stacked bars */}
          <div style={{display:"flex", alignItems:"flex-end", gap:4, height:140}}>
            {Array.from({length: 30}).map((_, i) => {
              const seed = ((i+1) * 7) % 13;
              const c = (seed % 4);
              const h = (seed % 5);
              const m = (seed % 6) + 1;
              const l = (seed % 8) + 2;
              const total = c + h + m + l;
              return (
                <div key={i} style={{flex:1, display:"flex", flexDirection:"column-reverse", height:"100%", borderRadius:3, overflow:"hidden", background:"var(--bg-2)"}}>
                  <div style={{height: `${(l/22)*100}%`, background:"#3b82f6"}}/>
                  <div style={{height: `${(m/22)*100}%`, background:"#f59e0b"}}/>
                  <div style={{height: `${(h/22)*100}%`, background:"#f97316"}}/>
                  <div style={{height: `${(c/22)*100}%`, background:"#ef4444"}}/>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:8, fontSize:10, color:"var(--fg-4)", fontFamily:"var(--font-mono)"}}>
            <span>30d ago</span><span>20d</span><span>10d</span><span>today</span>
          </div>
        </div>
      </div>

      <div className="filters mt-3 gsap-enter">
        <div className="search" style={{width:260, marginLeft:0}}>
          <span className="s-ico"><Icon name="search" size={13}/></span>
          <input placeholder="Filter by image…"/>
        </div>
        <FilterChip label="Severity" value="≥ medium"/>
        <FilterChip label="Status" value="All"/>
        <FilterChip label="Scanner" value="Trivy + Grype"/>
        <div style={{marginLeft:"auto", color:"var(--fg-3)", fontSize:11, fontFamily:"var(--font-mono)"}}>
          showing {SCANS.length} scans · {SCANS.reduce((a,s)=>a+s.crit+s.high+s.med+s.low,0)} findings
        </div>
      </div>

      <div className="card gsap-enter">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Scan</th>
                <th>Image</th>
                <th>Scanner</th>
                <th>Status</th>
                <th>Started</th>
                <th className="right">Duration</th>
                <th>Findings</th>
                <th className="right" style={{width:140}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {SCANS.map(s => (
                <tr key={s.id}>
                  <td className="mono dim" style={{fontSize:11}}>{s.id}</td>
                  <td>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                      <Icon name="package" size={13} style={{color:"var(--fg-3)"}}/>
                      <span style={{fontFamily:"var(--font-mono)", fontSize:12, maxWidth:280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{s.image}</span>
                    </div>
                  </td>
                  <td><Pill tone="outline">{s.scanner}</Pill></td>
                  <td>
                    {s.status === "done" && <Pill tone="ok"><Icon name="check" size={9}/> done</Pill>}
                    {s.status === "failed" && <Pill tone="bad"><Icon name="x" size={9}/> failed</Pill>}
                    {s.status === "running" && <Pill tone="info"><Icon name="refresh" size={9}/> running</Pill>}
                  </td>
                  <td className="mono dim" style={{fontSize:11}}>{s.started}</td>
                  <td className="right mono tabular">{s.duration}</td>
                  <td>
                    {s.status === "failed" ? <span style={{color:"var(--fg-4)", fontFamily:"var(--font-mono)", fontSize:11}}>—</span> : <VulnBar v={{crit:s.crit, high:s.high, med:s.med, low:s.low}}/>}
                  </td>
                  <td>
                    <div className="actions">
                      <ActionBtn icon="eye" title="View report"/>
                      <ActionBtn icon="download" title="Export"/>
                      <ActionBtn icon="refresh" title="Re-scan"/>
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

/* ===================================================================
   SBOMs
   =================================================================== */
function SBOMsPage() {
  const totalPkgs = SBOMS.reduce((a,s)=>a+s.packages,0);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">SBOMs</h1>
          <div className="page-sub">Software bills of materials · {SBOMS.length} images · {totalPkgs.toLocaleString()} packages tracked</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13}/> Export all</button>
          <button className="btn primary"><Icon name="sboms" size={13}/> Generate new</button>
        </div>
      </div>

      <div className="grid-4 gsap-enter">
        <StatCard label="SBOMs" icon="sboms" value={SBOMS.length} sub={<>last 24h</>} accent />
        <StatCard label="Packages" icon="package" value={totalPkgs.toLocaleString()} sub={<>across all images</>} tone="acc"/>
        <StatCard label="Unique licenses" icon="info" value="34" sub={<>MIT · Apache-2.0 · BSD-3 · …</>} tone="info"/>
        <StatCard label="EOL packages" icon="warn" value="12" sub={<>across 4 images</>} tone="warn"/>
      </div>

      <div className="filters mt-3 gsap-enter">
        <div className="search" style={{width:260, marginLeft:0}}>
          <span className="s-ico"><Icon name="search" size={13}/></span>
          <input placeholder="Filter by image or package…"/>
        </div>
        <FilterChip label="Format" value="All"/>
        <FilterChip label="Ecosystem" value="All"/>
        <div className="btn-group" style={{marginLeft:"auto"}}>
          <button className="btn active">SPDX</button>
          <button className="btn">CycloneDX</button>
          <button className="btn">JSON</button>
        </div>
      </div>

      <div className="grid-2 mt-1 gsap-enter">
        {SBOMS.map(s => {
          const max = s.packages;
          const segs = [
            { k: "go", color: "#00ADD8" },
            { k: "npm", color: "#cb3837" },
            { k: "deb", color: "#a81d33" },
            { k: "other", color: "#8b7cff" },
          ];
          return (
            <div key={s.image} className="card">
              <div style={{padding:"14px 16px", display:"flex", alignItems:"center", gap:10}}>
                <div style={{width:32, height:32, borderRadius:8, background:"var(--bg-3)", display:"grid", placeItems:"center"}}>
                  <Icon name="sboms" size={15} style={{color:"var(--acc)"}}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:500, fontFamily:"var(--font-mono)", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{s.image}</div>
                  <div style={{display:"flex", gap:8, fontSize:11, color:"var(--fg-3)", marginTop:2, fontFamily:"var(--font-mono)"}}>
                    <span>{s.format}</span>
                    <span>·</span>
                    <span>generated {s.generated}</span>
                  </div>
                </div>
                <button className="btn ghost"><Icon name="download" size={12}/></button>
                <button className="btn ghost"><Icon name="external" size={12}/></button>
              </div>
              <div className="divider" style={{margin:0}}/>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:8}}>
                  <span className="mono tabular" style={{fontSize:22, fontWeight:600}}>{s.packages.toLocaleString()}</span>
                  <span style={{color:"var(--fg-3)", fontSize:11}}>packages · {s.licenses} licenses</span>
                </div>
                <div className="bar seg" style={{height:8, marginBottom:8}}>
                  {segs.map(seg => s.ecosystem[seg.k] > 0 && (
                    <span key={seg.k} style={{width:`${(s.ecosystem[seg.k]/max)*100}%`, background: seg.color}}/>
                  ))}
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, fontSize:11}}>
                  {segs.map(seg => s.ecosystem[seg.k] > 0 && (
                    <div key={seg.k} style={{display:"flex", alignItems:"center", gap:5}}>
                      <span style={{width:8, height:8, background:seg.color, borderRadius:2}}/>
                      <span style={{color:"var(--fg-3)"}}>{seg.k}</span>
                      <span className="mono tabular" style={{marginLeft:"auto"}}>{s.ecosystem[seg.k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================================================================
   Alerts
   =================================================================== */
function AlertsPage() {
  const [tab, setTab] = React.useState("history");
  const firing = ALERTS.filter(a => a.state === "firing").length;
  const ack = ALERTS.filter(a => a.state === "ack").length;
  const resolved = ALERTS.filter(a => a.state === "resolved").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alerts</h1>
          <div className="page-sub">{firing} firing · {ack} acknowledged · {resolved} resolved · {ALERT_RULES.length} rules configured</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="bell" size={13}/> Mute all</button>
          <button className="btn primary"><Icon name="plus" size={13}/> New rule</button>
        </div>
      </div>

      <div className="grid-4 gsap-enter">
        <StatCard label="Firing" icon="warn" value={firing} sub={<>requires action</>} accent tone="bad"/>
        <StatCard label="Acknowledged" icon="check" value={ack} sub={<>in progress</>} tone="warn"/>
        <StatCard label="Resolved · 24h" icon="check" value={resolved} sub={<>auto + manual</>} tone="ok"/>
        <StatCard label="MTTR · 7d" icon="activity" value="14m" unit="" sub={<>mean time to resolve</>} spark={SPK2.cpu} tone="info"/>
      </div>

      <div className="tabs mt-4">
        <div className={`tab ${tab==="history"?"active":""}`} onClick={() => setTab("history")}>History<span className="count">{ALERTS.length}</span></div>
        <div className={`tab ${tab==="rules"?"active":""}`} onClick={() => setTab("rules")}>Rules<span className="count">{ALERT_RULES.length}</span></div>
        <div className={`tab ${tab==="channels"?"active":""}`} onClick={() => setTab("channels")}>Channels<span className="count">3</span></div>
      </div>

      {tab === "history" && (
        <div className="card gsap-enter">
          <div className="filters" style={{margin:0, borderRadius:"12px 12px 0 0", borderBottom:"1px solid var(--border)", border:"none", borderBottom:"1px solid var(--border)"}}>
            <div className="search" style={{width:260, marginLeft:0}}>
              <span className="s-ico"><Icon name="search" size={13}/></span>
              <input placeholder="Filter alerts…"/>
            </div>
            <div className="btn-group">
              <button className="btn active">All</button>
              <button className="btn">Firing</button>
              <button className="btn">Ack</button>
              <button className="btn">Resolved</button>
            </div>
            <FilterChip label="Severity" value="All"/>
            <FilterChip label="Range" value="24h"/>
          </div>
          {ALERTS.map((a, i) => {
            const iconTone = a.sev === "bad" ? "bad" : a.sev === "warn" ? "warn" : a.sev === "info" ? "info" : "ok";
            const iconName = a.sev === "bad" ? "warn" : a.sev === "warn" ? "warn" : a.sev === "info" ? "info" : "check";
            return (
              <div key={i} className="alert-row">
                <div className={`alert-icon ${iconTone}`}><Icon name={iconName} size={15}/></div>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:500, fontSize:13}}>{a.title}</div>
                  <div style={{fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)", display:"flex", gap:8, marginTop:2}}>
                    <span style={{color:"var(--fg-2)"}}>{a.target}</span>
                    <span>·</span>
                    <span>{a.rule}</span>
                  </div>
                </div>
                <div style={{fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{a.time}</div>
                <Pill tone={a.state === "firing" ? "bad" : a.state === "ack" ? "warn" : "ok"}>{a.state}</Pill>
                <div className="actions">
                  <ActionBtn icon="more" title="Actions"/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "rules" && (
        <div className="card gsap-enter">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{width:60}}>On</th>
                  <th>Rule</th>
                  <th>Expression</th>
                  <th>Severity</th>
                  <th>Channels</th>
                  <th className="right" style={{width:120}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ALERT_RULES.map(r => (
                  <tr key={r.name}>
                    <td>
                      <div style={{width:30, height:18, borderRadius:999, background: r.enabled ? "var(--acc)" : "var(--bg-3)", position:"relative", cursor:"pointer", transition:"background var(--dur) var(--ease)"}}>
                        <span style={{position:"absolute", top:2, left: r.enabled ? 14 : 2, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left var(--dur) var(--ease)"}}/>
                      </div>
                    </td>
                    <td style={{fontWeight:500}}>{r.name}</td>
                    <td><span className="code mono">{r.expr}</span></td>
                    <td><Pill tone={r.sev === "bad" ? "bad" : r.sev === "warn" ? "warn" : "info"}>{r.sev === "bad" ? "critical" : r.sev === "warn" ? "warning" : "info"}</Pill></td>
                    <td>
                      <div style={{display:"flex", gap:4}}>
                        {r.channels.map(ch => <span key={ch} className="pill outline" style={{fontSize:10}}>{ch}</span>)}
                      </div>
                    </td>
                    <td>
                      <div className="actions">
                        <ActionBtn icon="eye" title="Edit"/>
                        <ActionBtn icon="copy" title="Duplicate"/>
                        <ActionBtn icon="trash" title="Delete" tone="danger"/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "channels" && (
        <div className="grid-3 gsap-enter">
          {[
            { name: "Email", desc: "ops@helm.dev", icon: "info", count: 8, color: "var(--info)" },
            { name: "Slack", desc: "#incidents", icon: "command", count: 12, color: "#4a154b" },
            { name: "PagerDuty", desc: "production-rotation", icon: "bell", count: 2, color: "#06ac38" },
          ].map(ch => (
            <div key={ch.name} className="card">
              <div style={{padding:"16px 18px", display:"flex", alignItems:"center", gap:12}}>
                <div style={{width:36, height:36, borderRadius:8, background:`${ch.color}25`, display:"grid", placeItems:"center", border:`1px solid ${ch.color}40`}}>
                  <Icon name={ch.icon} size={16} style={{color: ch.color}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600, fontSize:14}}>{ch.name}</div>
                  <div style={{fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{ch.desc}</div>
                </div>
                <Pill tone="ok"><Icon name="check" size={9}/> connected</Pill>
              </div>
              <div className="divider" style={{margin:0}}/>
              <div style={{padding:"12px 18px", display:"flex", justifyContent:"space-between", fontSize:12}}>
                <span style={{color:"var(--fg-3)"}}>Routes</span>
                <span className="mono tabular">{ch.count} rules</span>
              </div>
            </div>
          ))}
          <div className="card" style={{display:"grid", placeItems:"center", padding:"30px", color:"var(--fg-3)", cursor:"pointer", borderStyle:"dashed"}}>
            <div style={{textAlign:"center"}}>
              <div style={{width:42, height:42, borderRadius:10, background:"var(--bg-3)", display:"grid", placeItems:"center", margin:"0 auto 8px"}}>
                <Icon name="plus" size={18}/>
              </div>
              <div style={{fontSize:13, fontWeight:500}}>Add channel</div>
              <div style={{fontSize:11, color:"var(--fg-4)", marginTop:2}}>Webhook · Discord · Telegram · …</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ScansPage, SBOMsPage, AlertsPage });
