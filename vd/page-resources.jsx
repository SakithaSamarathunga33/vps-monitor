/* Images + Networks + Databases pages */

const { IMAGES, NETWORKS, DATABASES, SPARKS: SPK } = window.HELM_DATA;

/* ===================================================================
   Images page
   =================================================================== */
function ImagesPage() {
  const totalSize = IMAGES.reduce((a, i) => a + parseFloat(i.size), 0);
  const dangling = IMAGES.filter(i => i.used === 0).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Images</h1>
          <div className="page-sub">{IMAGES.length} images · {totalSize.toFixed(0)} MB total · {dangling} unused</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="trash" size={13}/> Prune unused</button>
          <button className="btn"><Icon name="shield" size={13}/> Re-scan all</button>
          <button className="btn primary"><Icon name="download" size={13}/> Pull image</button>
        </div>
      </div>

      <div className="grid-4 gsap-enter">
        <StatCard label="Total images" icon="images" value={IMAGES.length} sub={<>{dangling} unused</>} accent />
        <StatCard label="Disk used" icon="disk" value={totalSize.toFixed(0)} unit=" MB" sub={<>across {IMAGES.length} images</>} tone="info" />
        <StatCard label="Vulnerabilities" icon="shield" value={IMAGES.reduce((a,i)=>a+i.vulns.crit+i.vulns.high,0)} unit=" high+"
          sub={<><Sev level="crit" count={IMAGES.reduce((a,i)=>a+i.vulns.crit,0)}/> <Sev level="high" count={IMAGES.reduce((a,i)=>a+i.vulns.high,0)}/></>}
          tone="bad" />
        <StatCard label="Avg layers" icon="package" value={(IMAGES.reduce((a,i)=>a+i.layers,0)/IMAGES.length).toFixed(1)} sub={<>per image</>} tone="warn" />
      </div>

      <div className="filters mt-3 gsap-enter">
        <div className="search" style={{width: 280, marginLeft:0}}>
          <span className="s-ico"><Icon name="search" size={13}/></span>
          <input placeholder="Filter by repository, tag, or digest…"/>
        </div>
        <FilterChip label="Registry" value="All"/>
        <FilterChip label="Status" value="All"/>
        <FilterChip label="Sort" value="Size · desc"/>
        <div style={{marginLeft:"auto", color:"var(--fg-3)", fontSize:11, fontFamily:"var(--font-mono)"}}>
          last sync · 3 min ago
        </div>
      </div>

      <div className="card gsap-enter">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:36}}><div className="chk"/></th>
                <th>Repository</th>
                <th>Tag</th>
                <th>Digest</th>
                <th className="right">Size</th>
                <th className="right">Layers</th>
                <th>Vulnerabilities</th>
                <th>Used by</th>
                <th>Created</th>
                <th className="right" style={{width:140}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {IMAGES.map((img, i) => (
                <tr key={img.id}>
                  <td><div className="chk"/></td>
                  <td>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                      <div style={{width:28, height:28, borderRadius:6, background:"var(--bg-3)", display:"grid", placeItems:"center", color:"var(--acc)"}}>
                        <Icon name="package" size={14}/>
                      </div>
                      <span style={{fontWeight:500, maxWidth:240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{img.repo}</span>
                    </div>
                  </td>
                  <td><span className="code">{img.tag}</span></td>
                  <td className="mono dim" style={{fontSize:11}}>{img.id.substring(0, 19)}…</td>
                  <td className="right mono tabular">{img.size}</td>
                  <td className="right mono tabular dim">{img.layers}</td>
                  <td><VulnBar v={img.vulns}/></td>
                  <td>
                    {img.used > 0
                      ? <Pill tone="ok">{img.used} container{img.used > 1 ? "s" : ""}</Pill>
                      : <Pill tone="outline">unused</Pill>}
                  </td>
                  <td className="mono dim" style={{fontSize:11}}>{img.created}</td>
                  <td>
                    <div className="actions">
                      <ActionBtn icon="refresh" title="Pull"/>
                      <ActionBtn icon="shield" title="Scan"/>
                      <ActionBtn icon="sboms" title="SBOM"/>
                      <ActionBtn icon="trash" title="Remove" tone="danger"/>
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
   Networks page
   =================================================================== */
function NetworksPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Networks</h1>
          <div className="page-sub">{NETWORKS.length} networks · {NETWORKS.reduce((a,n)=>a+n.containers,0)} attachments</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="refresh" size={13}/> Refresh</button>
          <button className="btn primary"><Icon name="plus" size={13}/> Create network</button>
        </div>
      </div>

      <div className="grid-4 gsap-enter">
        <StatCard label="Networks" icon="networks" value={NETWORKS.length} sub={<>{NETWORKS.filter(n=>n.driver==="bridge").length} bridge · {NETWORKS.filter(n=>n.driver==="host").length} host</>} accent />
        <StatCard label="Throughput" icon="net" value="476" unit=" KB/s" sub={<>↓ 384 · ↑ 92 KB/s</>} spark={SPK.net} tone="ok" />
        <StatCard label="Active conns" icon="link" value="148" sub={<>+12 last min</>} delta="+8%" tone="info" />
        <StatCard label="Dropped" icon="warn" value="0" sub={<>last 60s</>} tone="warn" />
      </div>

      <div className="grid-2 mt-3 gsap-enter">
        <div className="card">
          <CardHead title="INGRESS · last 60s" icon="arrow_down" live right={
            <span className="mono tabular" style={{fontSize:18, fontWeight:600}}>384<span style={{fontSize:11, color:"var(--fg-3)", fontWeight:500}}> KB/s</span></span>
          }/>
          <div style={{padding:"10px 12px 12px"}}>
            <LineChart series={SPK.net} height={140} color="var(--ok)" area="var(--ok-soft)" yMax={100} yTicks={[0,25,50,75,100]} unit="" xTicks={["−60s","−45s","−30s","−15s","now"]}/>
          </div>
        </div>
        <div className="card">
          <CardHead title="EGRESS · last 60s" icon="arrow_up" live right={
            <span className="mono tabular" style={{fontSize:18, fontWeight:600}}>92<span style={{fontSize:11, color:"var(--fg-3)", fontWeight:500}}> KB/s</span></span>
          }/>
          <div style={{padding:"10px 12px 12px"}}>
            <LineChart series={SPK.netTx} height={140} color="var(--info)" area="var(--info-soft)" yMax={100} yTicks={[0,25,50,75,100]} unit="" xTicks={["−60s","−45s","−30s","−15s","now"]}/>
          </div>
        </div>
      </div>

      <div className="card mt-3 gsap-enter">
        <CardHead title="DOCKER NETWORKS" icon="networks"/>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Driver</th>
                <th>Scope</th>
                <th>Subnet</th>
                <th>Gateway</th>
                <th className="right">Containers</th>
                <th>Flags</th>
                <th className="right" style={{width:140}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {NETWORKS.map(n => (
                <tr key={n.name}>
                  <td>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                      <span style={{width:8, height:8, borderRadius:2, background: n.driver === "bridge" ? "var(--acc)" : n.driver === "host" ? "var(--warn)" : "var(--fg-4)"}}/>
                      <span style={{fontWeight:500}}>{n.name}</span>
                    </div>
                  </td>
                  <td><Pill tone={n.driver === "bridge" ? "acc" : n.driver === "host" ? "warn" : "outline"}>{n.driver}</Pill></td>
                  <td className="mono dim">{n.scope}</td>
                  <td className="mono">{n.subnet}</td>
                  <td className="mono dim">{n.gateway}</td>
                  <td className="right mono tabular">{n.containers}</td>
                  <td>
                    <div style={{display:"flex", gap:4}}>
                      {n.attachable && <span className="code">attachable</span>}
                      {n.internal && <span className="code">internal</span>}
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      <ActionBtn icon="eye" title="Inspect"/>
                      <ActionBtn icon="external" title="Connect"/>
                      <ActionBtn icon="trash" title="Remove" tone="danger"/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Topology preview */}
      <div className="card mt-3 gsap-enter">
        <CardHead title="TOPOLOGY · coolify (bridge)" icon="globe" right={<button className="btn ghost"><Icon name="external" size={12}/> Open</button>}/>
        <div style={{padding:"20px", display:"flex", flexDirection:"column", gap:16}}>
          <div style={{position:"relative", height:160, background:"var(--bg-2)", borderRadius:10, overflow:"hidden", border:"1px solid var(--border)"}}>
            <svg width="100%" height="160" viewBox="0 0 900 160" preserveAspectRatio="none" style={{position:"absolute", inset:0}}>
              {/* radial lines from center hub */}
              <defs>
                <linearGradient id="netl" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--acc)" stopOpacity="0.6"/>
                  <stop offset="1" stopColor="var(--acc)" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[80,180,280,380,520,620,720,820].map((x, i) => (
                <line key={i} x1="450" y1="80" x2={x} y2={i%2?30:130} stroke="var(--border-2)" strokeWidth="1" strokeDasharray="2 3"/>
              ))}
              {[80,180,280,380,520,620,720,820].map((x, i) => (
                <g key={i}>
                  <circle cx={x} cy={i%2?30:130} r="14" fill="var(--bg-3)" stroke="var(--border-2)"/>
                  <text x={x} y={i%2?34:134} textAnchor="middle" fontSize="10" fill="var(--fg-3)" fontFamily="var(--font-mono)">c{i+1}</text>
                </g>
              ))}
              <circle cx="450" cy="80" r="24" fill="var(--acc-soft)" stroke="var(--acc)"/>
              <text x="450" y="84" textAnchor="middle" fontSize="11" fill="var(--acc)" fontFamily="var(--font-mono)" fontWeight="600">coolify</text>
            </svg>
          </div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <Pill tone="acc">coolify-proxy · 172.18.0.2</Pill>
            <Pill tone="acc">coolify-db · 172.18.0.3</Pill>
            <Pill tone="acc">coolify-redis · 172.18.0.4</Pill>
            <Pill tone="acc">coolify-sentinel · 172.18.0.5</Pill>
            <Pill tone="acc">coolify-realtime · 172.18.0.6</Pill>
            <Pill tone="acc">minio-store · 172.18.0.7</Pill>
            <Pill tone="acc">tg-bot-prod · 172.18.0.8</Pill>
            <Pill tone="acc">vps-monitor-… · 172.18.0.9</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   Databases page
   =================================================================== */
function DatabasesPage() {
  const totalConns = DATABASES.reduce((a,d)=>a+d.conns, 0);
  const totalQPS = DATABASES.reduce((a,d)=>a+d.qps, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Databases</h1>
          <div className="page-sub">{DATABASES.length} databases · {totalConns} active connections · {totalQPS.toLocaleString()} qps</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13}/> Backup</button>
          <button className="btn primary"><Icon name="plus" size={13}/> Connect database</button>
        </div>
      </div>

      <div className="grid-4 gsap-enter">
        <StatCard label="Databases" icon="databases" value={DATABASES.length} sub={<>{DATABASES.filter(d=>d.engine==="postgres").length} pg · {DATABASES.filter(d=>d.engine==="redis").length} redis · {DATABASES.filter(d=>!["postgres","redis"].includes(d.engine)).length} other</>} accent/>
        <StatCard label="Connections" icon="link" value={totalConns} sub={<>peak <span className="mono">112</span></>} spark={SPK.cpu} tone="acc"/>
        <StatCard label="Queries / sec" icon="zap" value={totalQPS.toLocaleString()} sub={<>+18% vs 1h ago</>} delta="+18%" tone="ok"/>
        <StatCard label="Slow queries" icon="flame" value="3" sub={<>last 5m · &gt;500ms</>} tone="warn"/>
      </div>

      <div className="grid-3 mt-3 gsap-enter">
        {DATABASES.map(db => {
          const stateTone = db.state === "ok" ? "ok" : db.state === "warn" ? "warn" : "bad";
          const connPct = (db.conns / db.maxConns) * 100;
          const engineColor = db.engine === "postgres" ? "#336791" : db.engine === "redis" ? "#dc382d" : db.engine === "mysql" ? "#00758f" : "#fbcd1c";
          return (
            <div key={db.name} className="card">
              <div style={{padding:"14px 16px 12px", display:"flex", alignItems:"center", gap:10}}>
                <div style={{width:34, height:34, borderRadius:8, background:`${engineColor}25`, display:"grid", placeItems:"center", border:`1px solid ${engineColor}40`}}>
                  <Icon name="databases" size={16} style={{color: engineColor}}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:600, fontSize:14}}>{db.name}</div>
                  <div style={{fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>{db.engine} {db.version}</div>
                </div>
                <Pill tone={stateTone}>{db.state}</Pill>
              </div>
              <div className="divider" style={{margin:0}}/>
              <div style={{padding:"12px 16px"}}>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10}}>
                  <div>
                    <div style={{fontSize:10, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.08em"}}>Size</div>
                    <div className="mono tabular" style={{fontSize:14, fontWeight:600}}>{db.size}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing:"0.08em"}}>QPS</div>
                    <div className="mono tabular" style={{fontSize:14, fontWeight:600}}>{db.qps.toLocaleString()}</div>
                  </div>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--fg-3)", marginBottom:4}}>
                  <span>Connections</span>
                  <span className="mono tabular">{db.conns} / {db.maxConns}</span>
                </div>
                <Bar value={connPct} tone={connPct > 80 ? "bad" : connPct > 60 ? "warn" : ""}/>
                <div style={{marginTop:10}}>
                  <Sparkline data={SPK.cpu} width={300} height={32} color={engineColor} area={`${engineColor}30`}/>
                </div>
                <div style={{display:"flex", alignItems:"center", marginTop:10, fontSize:11, color:"var(--fg-3)", fontFamily:"var(--font-mono)"}}>
                  <span>{db.host}:{db.port}</span>
                  {db.slow > 0 && <Pill tone="warn" dot style={{marginLeft:"auto"}}>{db.slow} slow</Pill>}
                </div>
              </div>
              <div className="divider" style={{margin:0}}/>
              <div style={{padding:"8px 12px", display:"flex", gap:4}}>
                <button className="btn ghost" style={{flex:1, justifyContent:"center"}}><Icon name="terminal" size={12}/> Query</button>
                <button className="btn ghost" style={{flex:1, justifyContent:"center"}}><Icon name="activity" size={12}/> Metrics</button>
                <button className="btn ghost" style={{flex:1, justifyContent:"center"}}><Icon name="download" size={12}/> Backup</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ImagesPage, NetworksPage, DatabasesPage });
