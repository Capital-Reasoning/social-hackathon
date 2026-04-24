// RouteCard.jsx — Route summary card

const RouteCard = ({ route, onSelect, selected }) => {
  const statusMap = {
    'on-track':    { bg:'#edfaf3', color:'#1e6b3e', border:'#b0e8c6', dot:'#4ead6f', label:'On track' },
    'delayed':     { bg:'#fff8eb', color:'#7a4f00', border:'#fce0a0', dot:'#f0a830', label:'Delayed' },
    'not-started': { bg:'#f0ede0', color:'#4a4a60', border:'#dddac8', dot:'#b0aca0', label:'Not started' },
    'complete':    { bg:'#edfaf3', color:'#1e6b3e', border:'#b0e8c6', dot:'#4ead6f', label:'Complete' },
  };
  const st = statusMap[route.status] || statusMap['not-started'];

  return (
    <div onClick={() => onSelect(route.id)} style={{ ...rcS.card, ...(selected ? rcS.selected : {}), cursor:'pointer' }}>
      <div style={rcS.top}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Img src={IC('delivery-van.png')} size={32} alt="" />
          <div>
            <div style={rcS.name}>{route.name}</div>
            <div style={rcS.sub}>{route.stops} stops · <span style={{ color: route.driver ? '#4a4a60' : '#9b1c1c' }}>{route.driver || 'No driver assigned'}</span></div>
          </div>
        </div>
        <span style={{ ...rcS.badge, background:st.bg, color:st.color, border:`1.5px solid ${st.border}` }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:st.dot, display:'inline-block', marginRight:6, flexShrink:0 }} />
          {st.label}
        </span>
      </div>
      <div style={rcS.divider} />
      <div style={rcS.stats}>
        {[
          { val:route.delivered, label:'Delivered', color:'#2038c0', icon:'checkmark-circle.png' },
          { val:route.remaining, label:'Remaining', color:'#7a4f00', icon:'clock.png' },
          { val:route.missed,    label:'Missed',    color: route.missed > 0 ? '#9b1c1c' : '#4a4a60', icon:'flag.png' },
          { val:route.eta,       label:'Est. done', color:'#4a4a60', icon:'route-stops.png' },
        ].map(s => (
          <div key={s.label} style={rcS.stat}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Img src={IC(s.icon)} size={20} alt="" />
              <span style={{ ...rcS.num, color:s.color }}>{s.val}</span>
            </div>
            <span style={rcS.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const rcS = {
  card: { background:'#fff', borderRadius:12, border:'1.5px solid rgba(24,24,60,0.13)', padding:'18px 20px', marginBottom:10, transition:'border-color 150ms' },
  selected: { border:'2px solid rgba(61,92,245,0.45)', background:'#f8f9ff' },
  top: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  name: { fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:600, color:'#1c1c2e', marginBottom:2 },
  sub: { fontSize:13, color:'#4a4a60' },
  badge: { display:'inline-flex', alignItems:'center', padding:'5px 12px', borderRadius:999, fontSize:12, fontWeight:600, flexShrink:0, fontFamily:"'DM Sans',sans-serif" },
  divider: { height:1.5, background:'rgba(24,24,60,0.07)', marginBottom:14 },
  stats: { display:'flex', gap:28 },
  stat: { display:'flex', flexDirection:'column', gap:3 },
  num: { fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:700, lineHeight:1 },
  statLabel: { fontSize:11, color:'#6a6a80', fontFamily:"'DM Sans',sans-serif" },
};

Object.assign(window, { RouteCard, rcS });
