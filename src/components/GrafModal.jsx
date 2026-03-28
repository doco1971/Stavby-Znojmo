import { useState, useMemo } from "react";
import { TENANT, tc1 } from "../utils/tenant";
import { useDraggable, dragHeaderStyle, dragHint } from "../hooks/useDraggable";

export function GrafModal({ data, firmy, isDark, onClose }) {
  const [mode, setMode] = useState("firma");
  const { pos, onMouseDown: onDragStart } = useDraggable(1400, 700);

  const firmaColorMap = Object.fromEntries(firmy.map(f => [f.hodnota, f.barva || TENANT.p2]));

  const katI  = r => (Number(r.ps_i)||0) + (Number(r.snk_i)||0) + (Number(r.bo_i)||0);
  const katII = r => (Number(r.ps_ii)||0) + (Number(r.bo_ii)||0) + (Number(r.poruch)||0);

  const grafData = useMemo(() => {
    if (mode === "firma") {
      const map = {};
      data.forEach(r => {
        const key = r.firma || "Bez firmy";
        if (!map[key]) map[key] = { name: key, nabidka: 0, vyfakturovano: 0, zrealizovano: 0 };
        map[key].nabidka       += Number(r.nabidka) || 0;
        map[key].vyfakturovano += Number(r.vyfakturovano) || 0;
        map[key].zrealizovano  += Number(r.zrealizovano) || 0;
      });
      return Object.values(map);
    } else if (mode === "mesic") {
      const map = {};
      data.forEach(r => {
        if (!r.ze_dne) return;
        const parts = r.ze_dne.trim().split(".");
        if (parts.length < 3) return;
        const key   = `${parts[2]}-${parts[1].padStart(2,"0")}`;
        const label = `${parts[1]}/${parts[2]}`;
        if (!map[key]) map[key] = { name: label, _sort: key, nabidka: 0, vyfakturovano: 0, zrealizovano: 0 };
        map[key].nabidka       += Number(r.nabidka) || 0;
        map[key].vyfakturovano += Number(r.vyfakturovano) || 0;
        map[key].zrealizovano  += Number(r.zrealizovano) || 0;
      });
      return Object.values(map).sort((a, b) => a._sort.localeCompare(b._sort));
    } else {
      const firmaKeys = [...new Set(data.map(r => r.firma || "Bez firmy"))];
      return firmaKeys.map(firma => {
        const rows = data.filter(r => (r.firma || "Bez firmy") === firma);
        return {
          name:  firma,
          ps_i:  rows.reduce((s,r) => s+(Number(r.ps_i)||0),  0),
          snk_i: rows.reduce((s,r) => s+(Number(r.snk_i)||0), 0),
          bo_i:  rows.reduce((s,r) => s+(Number(r.bo_i)||0),  0),
          ps_ii: rows.reduce((s,r) => s+(Number(r.ps_ii)||0), 0),
          bo_ii: rows.reduce((s,r) => s+(Number(r.bo_ii)||0), 0),
          poruch:rows.reduce((s,r) => s+(Number(r.poruch)||0),0),
          kat1:  rows.reduce((s,r) => s+katI(r),  0),
          kat2:  rows.reduce((s,r) => s+katII(r), 0),
        };
      });
    }
  }, [data, mode]);

  const fmtTick = (v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v);
  const fmtVal  = (v) => Number(v).toLocaleString("cs-CZ", { minimumFractionDigits: 0 });

  const modalBg = isDark ? TENANT.modalBg : "#fff";
  const textC   = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC  = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const gridC   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const renderBars = () => {
    const isKat = mode === "kat";
    const KAT_I_KEYS    = ["ps_i","snk_i","bo_i"];
    const KAT_II_KEYS   = ["ps_ii","bo_ii","poruch"];
    const KAT_I_COLORS  = ["#818cf8","#38bdf8","#4ade80"];
    const KAT_II_COLORS = ["#fb923c","#f87171","#e879f9"];
    const KAT_I_LABELS  = ["Plán. I","SNK","Běžné op. I"];
    const KAT_II_LABELS = ["Plán. II","Běžné op. II","Poruchy"];
    const KEYS   = isKat ? ["kat1","kat2"] : ["nabidka","vyfakturovano","zrealizovano"];
    const LABELS = isKat ? ["Kat. I","Kat. II"] : ["Nabídka","Vyfakturováno","Zrealizováno"];
    const COLORS = isKat ? ["#818cf8","#fb923c"] : [TENANT.p3,"#4ade80","#fbbf24"];

    const maxVal = Math.max(...grafData.map(d => isKat
      ? Math.max(KAT_I_KEYS.reduce((s,k)=>s+(d[k]||0),0), KAT_II_KEYS.reduce((s,k)=>s+(d[k]||0),0))
      : Math.max(...KEYS.map(k => d[k] || 0))
    ), 1);

    const W = 700, H = 280, PAD_L = 68, PAD_B = 30, PAD_T = 20, PAD_R = 20;
    const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
    const groupW = chartW / Math.max(grafData.length, 1);
    const numBars = isKat ? 2 : KEYS.length;
    const barW = Math.min(Math.max(10, groupW / (numBars + 1) - 2), 36);
    const scaleY = v => PAD_T + chartH - (v / maxVal) * chartH;
    const offsets = Array.from({length: numBars}, (_,ki) => (ki - (numBars-1)/2) * (barW + 4));

    return (
      <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 280, minWidth: 500 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(p => {
          const y = PAD_T + p * chartH;
          return <g key={p}>
            <line x1={PAD_L} x2={W-PAD_R} y1={y} y2={y} stroke={gridC} strokeWidth={1}/>
            <text x={PAD_L-6} y={y+4} textAnchor="end" fill={mutedC} fontSize={9}>{fmtTick(maxVal*(1-p))}</text>
          </g>;
        })}
        <line x1={PAD_L} x2={W-PAD_R} y1={PAD_T+chartH} y2={PAD_T+chartH} stroke={isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)"} strokeWidth={1}/>
        {grafData.map((d, gi) => {
          const cx = PAD_L + gi * groupW + groupW / 2;
          if (isKat) {
            return [
              { keys: KAT_I_KEYS,  colors: KAT_I_COLORS,  off: offsets[0] },
              { keys: KAT_II_KEYS, colors: KAT_II_COLORS, off: offsets[1] },
            ].map(({ keys, colors, off }) => {
              let stackY = PAD_T + chartH;
              return keys.map((k, ki) => {
                const val = d[k] || 0;
                if (val <= 0) return null;
                const bh = Math.max(2, (val / maxVal) * chartH);
                stackY -= bh;
                return <rect key={k} x={cx+off-barW/2} y={stackY} width={barW} height={bh} fill={colors[ki]} rx={ki===keys.length-1?3:0} opacity={0.9}/>;
              });
            });
          }
          return KEYS.map((k, ki) => {
            const val  = d[k] || 0;
            const bh   = Math.max(1, (val / maxVal) * chartH);
            const fill = mode === "firma" && ki === 0 ? (firmaColorMap[d.name] || COLORS[0]) : COLORS[ki];
            return <rect key={k} x={cx+offsets[ki]-barW/2} y={scaleY(val)} width={barW} height={bh} fill={fill} rx={3} opacity={0.88}/>;
          });
        })}
        {grafData.map((d, gi) => {
          const cx  = PAD_L + gi * groupW + groupW / 2;
          const lbl = d.name.length > 16 ? d.name.slice(0,15)+"…" : d.name;
          return <text key={gi} x={cx} y={H-PAD_B+18} textAnchor="middle" fill={mutedC} fontSize={11} fontWeight={600}>{lbl}</text>;
        })}
      </svg>
      {isKat ? (
        <div style={{ display: "flex", gap: 24, padding: "10px 16px 4px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: isDark?"#818cf8":"#4f46e5", marginBottom: 5, letterSpacing: 0.5 }}>── KAT. I ──</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {KAT_I_LABELS.map((l,i) => <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:11, height:11, borderRadius:3, background:KAT_I_COLORS[i] }}/><span style={{ fontSize:11, color:mutedC }}>{l}</span></div>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: isDark?"#fb923c":"#ea580c", marginBottom: 5, letterSpacing: 0.5 }}>── KAT. II ──</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {KAT_II_LABELS.map((l,i) => <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:11, height:11, borderRadius:3, background:KAT_II_COLORS[i] }}/><span style={{ fontSize:11, color:mutedC }}>{l}</span></div>)}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 14, padding: "10px 16px 4px", flexWrap: "wrap" }}>
          {LABELS.map((l,i) => <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:11, height:11, borderRadius:3, background:COLORS[i] }}/><span style={{ fontSize:11, color:mutedC }}>{l}</span></div>)}
        </div>
      )}
      </>
    );
  };

  const renderTable = () => {
    if (mode === "kat") {
      const cols = [
        { key:"ps_i",   label:"Plán. I",     color:"#818cf8" },
        { key:"snk_i",  label:"SNK",          color:"#38bdf8" },
        { key:"bo_i",   label:"Běžné op. I",  color:"#4ade80" },
        { key:"ps_ii",  label:"Plán. II",     color:"#fb923c" },
        { key:"bo_ii",  label:"Běžné op. II", color:"#f87171" },
        { key:"poruch", label:"Poruchy",       color:"#e879f9" },
      ];
      const thS = (label, color) => ({ padding:"7px 8px", textAlign:"right", color, fontWeight:700, fontSize:10, borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`, whiteSpace:"nowrap" });
      const bdC = isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)";
      return (
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ background: isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)" }}>
              <th style={{ padding:"7px 10px", textAlign:"left", color:mutedC, fontWeight:700, fontSize:10, borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}` }}>Firma</th>
              {cols.map(c => <th key={c.key} style={thS(c.label, c.color)}>{c.label}</th>)}
              <th style={thS("Kat. I",  "#818cf8")}>Kat. I</th>
              <th style={thS("Kat. II", "#fb923c")}>Kat. II</th>
              <th style={thS("Celkem",  isDark?TENANT.p4:TENANT.p1)}>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {grafData.map((d, i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${bdC}` }}>
                <td style={{ padding:"5px 10px", color:textC, fontWeight:600, whiteSpace:"nowrap" }}>
                  <span style={{ display:"inline-block", width:8, height:8, borderRadius:2, background:firmaColorMap[d.name]||TENANT.p2, marginRight:6, verticalAlign:"middle" }}/>
                  {d.name}
                </td>
                {cols.map(c => <td key={c.key} style={{ padding:"5px 8px", textAlign:"right", color:d[c.key]>0?c.color:mutedC, fontFamily:"monospace", fontSize:11 }}>{d[c.key]>0?fmtVal(d[c.key]):"—"}</td>)}
                <td style={{ padding:"5px 10px", textAlign:"right", color:"#818cf8", fontFamily:"monospace", fontSize:11, fontWeight:700 }}>{fmtVal(d.kat1)}</td>
                <td style={{ padding:"5px 10px", textAlign:"right", color:"#fb923c", fontFamily:"monospace", fontSize:11, fontWeight:700 }}>{fmtVal(d.kat2)}</td>
                <td style={{ padding:"5px 10px", textAlign:"right", color:isDark?TENANT.p4:TENANT.p1, fontFamily:"monospace", fontSize:11, fontWeight:700 }}>{fmtVal((d.kat1||0)+(d.kat2||0))}</td>
              </tr>
            ))}
            <tr style={{ background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)" }}>
              <td style={{ padding:"6px 10px", color:textC, fontWeight:700, fontSize:11 }}>CELKEM</td>
              {cols.map(c => <td key={c.key} style={{ padding:"6px 8px", textAlign:"right", color:c.color, fontFamily:"monospace", fontSize:11, fontWeight:700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d[c.key]||0),0))}</td>)}
              <td style={{ padding:"6px 10px", textAlign:"right", color:"#818cf8", fontFamily:"monospace", fontWeight:700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d.kat1||0),0))}</td>
              <td style={{ padding:"6px 10px", textAlign:"right", color:"#fb923c", fontFamily:"monospace", fontWeight:700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d.kat2||0),0))}</td>
              <td style={{ padding:"6px 10px", textAlign:"right", color:isDark?TENANT.p4:TENANT.p1, fontFamily:"monospace", fontWeight:700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d.kat1||0)+(d.kat2||0),0))}</td>
            </tr>
          </tbody>
        </table>
      );
    }
    const bdC = isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)";
    return (
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr style={{ background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)" }}>
            {[mode==="firma"?"Firma":"Měsíc","Nabídka","Vyfakturováno","Zrealizováno"].map((h,i) => (
              <th key={h} style={{ padding:"7px 12px", textAlign:i===0?"left":"right", color:mutedC, fontWeight:700, fontSize:11, borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grafData.map((d,i) => (
            <tr key={i} style={{ borderBottom:`1px solid ${bdC}` }}>
              <td style={{ padding:"6px 12px", color:textC, fontWeight:600 }}>
                {mode==="firma" && <span style={{ display:"inline-block", width:10, height:10, borderRadius:2, background:firmaColorMap[d.name]||TENANT.p2, marginRight:7, verticalAlign:"middle" }}/>}
                {d.name}
              </td>
              {["nabidka","vyfakturovano","zrealizovano"].map(k => (
                <td key={k} style={{ padding:"6px 12px", textAlign:"right", color:isDark?TENANT.p4:TENANT.p1, fontFamily:"monospace", fontSize:12 }}>{fmtVal(d[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderKolac = () => {
    const map = {};
    data.forEach(r => { const key = r.firma||"Bez firmy"; if (!map[key]) map[key]=0; map[key]+=Number(r.nabidka)||0; });
    const items = Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    const total = items.reduce((s,[,v])=>s+v,0);
    if (total===0) return <div style={{ textAlign:"center", color:mutedC, padding:48 }}>Žádná data k zobrazení</div>;
    const CX=110, CY=110, R=90, IR=45;
    let angle = -Math.PI/2;
    const slices = items.map(([name,val]) => {
      const frac=val/total, a1=angle, a2=angle+frac*2*Math.PI;
      angle=a2;
      return { name, val, frac, x1:CX+R*Math.cos(a1), y1:CY+R*Math.sin(a1), x2:CX+R*Math.cos(a2), y2:CY+R*Math.sin(a2), lg:frac>0.5?1:0 };
    });
    const colors = items.map(([name])=>firmaColorMap[name]||TENANT.p2);
    return (
      <div style={{ display:"flex", gap:32, alignItems:"center", flexWrap:"wrap", padding:"8px 0" }}>
        <svg width={220} height={220} viewBox="0 0 220 220" style={{ flexShrink:0 }}>
          {slices.map((s,i) => <path key={i} d={`M${CX},${CY} L${s.x1},${s.y1} A${R},${R} 0 ${s.lg},1 ${s.x2},${s.y2} Z`} fill={colors[i]} opacity={0.88}/>)}
          <circle cx={CX} cy={CY} r={IR} fill={modalBg}/>
          <text x={CX} y={CY-6} textAnchor="middle" fontSize={13} fontWeight={600} fill={isDark?"#fff":"#1e293b"}>{fmtTick(total)}</text>
          <text x={CX} y={CY+10} textAnchor="middle" fontSize={10} fill={mutedC}>celkem</text>
        </svg>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {items.map(([name,val],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
              <div style={{ width:11, height:11, borderRadius:3, background:colors[i], flexShrink:0 }}/>
              <span style={{ color:isDark?"#e2e8f0":"#1e293b", fontWeight:600 }}>{name}</span>
              <span style={{ color:mutedC, marginLeft:"auto", paddingLeft:16 }}>{Math.round((val/total)*100)} % · {fmtTick(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrend = () => {
    const map = {};
    data.forEach(r => {
      if (!r.ze_dne) return;
      const parts = r.ze_dne.trim().split(".");
      if (parts.length < 3) return;
      const key = `${parts[2]}-${parts[1].padStart(2,"0")}`, label=`${parts[1]}/${parts[2]}`;
      if (!map[key]) map[key]={ name:label, _sort:key, vyfakturovano:0, nabidka:0 };
      map[key].vyfakturovano += Number(r.vyfakturovano)||0;
      map[key].nabidka       += Number(r.nabidka)||0;
    });
    const pts = Object.values(map).sort((a,b)=>a._sort.localeCompare(b._sort));
    if (pts.length < 2) return <div style={{ textAlign:"center", color:mutedC, padding:48 }}>Nedostatek dat pro trend (potřeba alespoň 2 měsíce s datem SOD)</div>;
    const maxVal=Math.max(...pts.map(p=>Math.max(p.vyfakturovano,p.nabidka)),1);
    const W=700,H=240,PL=70,PB=30,PT=20,PR=20,cW=W-PL-PR,cH=H-PT-PB;
    const xPos=(i)=>PL+i*(cW/(pts.length-1)), yPos=(v)=>PT+cH-(v/maxVal)*cH;
    const lineD=(key)=>pts.map((p,i)=>`${i===0?"M":"L"}${xPos(i)},${yPos(p[key])}`).join(" ");
    const gC=isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)";
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:240, minWidth:400 }}>
          {[0,0.25,0.5,0.75,1].map(p => { const y=PT+p*cH; return <g key={p}><line x1={PL} x2={W-PR} y1={y} y2={y} stroke={gC} strokeWidth={1}/><text x={PL-6} y={y+4} textAnchor="end" fill={mutedC} fontSize={9}>{fmtTick(maxVal*(1-p))}</text></g>; })}
          <line x1={PL} x2={W-PR} y1={PT+cH} y2={PT+cH} stroke={isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)"} strokeWidth={1}/>
          <polygon points={pts.map((p,i)=>`${xPos(i)},${yPos(p.nabidka)}`).join(" ")+` ${xPos(pts.length-1)},${PT+cH} ${PL},${PT+cH}`} fill={TENANT.p3} fillOpacity={0.1}/>
          <polygon points={pts.map((p,i)=>`${xPos(i)},${yPos(p.vyfakturovano)}`).join(" ")+` ${xPos(pts.length-1)},${PT+cH} ${PL},${PT+cH}`} fill="#4ade80" fillOpacity={0.15}/>
          <path d={lineD("nabidka")} fill="none" stroke={TENANT.p3} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
          <path d={lineD("vyfakturovano")} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
          {pts.map((p,i) => <g key={i}><circle cx={xPos(i)} cy={yPos(p.nabidka)} r={3.5} fill={TENANT.p3}/><circle cx={xPos(i)} cy={yPos(p.vyfakturovano)} r={3.5} fill="#4ade80"/><text x={xPos(i)} y={H-PB+16} textAnchor="middle" fill={mutedC} fontSize={10}>{p.name}</text></g>)}
        </svg>
        <div style={{ display:"flex", gap:18, padding:"6px 0 0 70px", flexWrap:"wrap" }}>
          {[[TENANT.p3,"Nabídka"],["#4ade80","Vyfakturováno"]].map(([c,l]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:11, height:11, borderRadius:3, background:c }}/>
              <span style={{ fontSize:12, color:mutedC }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: "min(1100px,97vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.12)"}`, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>

        <div onMouseDown={onDragStart} style={dragHeaderStyle({ flexWrap:"wrap", gap:10 })}>
          <div>
            <span style={{ color: isDark?"#fff":"#1e293b", fontWeight:700, fontSize:15 }}>📊 Graf nákladů{dragHint}</span>
            <div style={{ color:mutedC, fontSize:11, marginTop:2 }}>
              {mode==="kat"?"Kat. I vs Kat. II":mode==="kolac"?"Podíl firem na celkové nabídce":mode==="trend"?"Vývoj vyfakturování v čase":"Nabídka · Vyfakturováno · Zrealizováno"}
            </div>
          </div>
          <div onMouseDown={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, borderRadius:8, overflow:"hidden" }}>
              {[["firma","🏢 Firma"],["mesic","📅 Měsíc"],["kat","📂 Kat. I / II"],["kolac","🥧 Podíl firem"],["trend","📈 Trend"]].map(([val,lbl]) => (
                <button key={val} onClick={() => setMode(val)} style={{ padding:"6px 13px", background:mode===val?(isDark?tc1(0.4):tc1(0.15)):"transparent", border:"none", borderRight:`1px solid ${isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}`, color:mode===val?TENANT.p3:mutedC, cursor:"pointer", fontSize:12, fontWeight:mode===val?700:400, whiteSpace:"nowrap" }}>{lbl}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:mutedC, fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:"16px 22px 8px", overflowX:"hidden", overflowY:"hidden", flexShrink:0 }}>
          {mode==="kolac" ? renderKolac()
          : mode==="trend" ? renderTrend()
          : grafData.length===0 ? <div style={{ textAlign:"center", color:mutedC, padding:48 }}>Žádná data k zobrazení</div>
          : renderBars()}
        </div>

        {mode !== "kolac" && mode !== "trend" && (
          <div style={{ padding:"0 22px 18px", flex:1, overflowY:"auto", overflowX:"hidden" }}>
            {renderTable()}
          </div>
        )}
      </div>
    </div>
  );
}
