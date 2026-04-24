// RecipientList.jsx — Searchable recipient list with dietary flags

const RecipientRow = ({ r, onSelect }) => {
  const dietMap = {
    'nut':      { bg:'#fff8eb', color:'#7a4f00', border:'#fce0a0', label:'Nut allergy',        icon:'allergy-peanut.png' },
    'dairy':    { bg:'#f0f3ff', color:'#2038c0', border:'#c0ceff', label:'Dairy-free',          icon:'snowflake.png' },
    'diabetic': { bg:'#edfaf3', color:'#1e6b3e', border:'#b0e8c6', label:'Diabetic-friendly',   icon:'shield-check.png' },
    'soft':     { bg:'#f0ede0', color:'#4a4a60', border:'#dddac8', label:'Soft foods',          icon:'fork-knife.png' },
    'sodium':   { bg:'#f0ede0', color:'#4a4a60', border:'#dddac8', label:'Low sodium',          icon:'fork-knife.png' },
  };
  const statusMap = {
    'delivered': { color:'#1e6b3e', label:'Delivered', icon:'checkmark-circle.png' },
    'pending':   { color:'#4a4a60', label:'Pending',   icon:'clock.png' },
    'missed':    { color:'#9b1c1c', label:'Missed',    icon:'flag.png' },
  };
  const ds = statusMap[r.status] || statusMap['pending'];

  return (
    <div onClick={() => onSelect(r)} style={rlS.row}>
      <div style={{ ...rlS.avatar, background:r.avatarColor||'#fae278' }}>
        {r.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={rlS.name}>{r.name}</div>
        <div style={rlS.addr}>{r.address}</div>
        {r.diets && r.diets.length > 0 && (
          <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
            {r.diets.map(d => {
              const dc = dietMap[d]; if (!dc) return null;
              return (
                <span key={d} style={{ background:dc.bg, color:dc.color, border:`1.5px solid ${dc.border}`, borderRadius:4, fontSize:12, fontWeight:600, padding:'3px 8px', display:'inline-flex', alignItems:'center', gap:5 }}>
                  <Img src={IC(dc.icon)} size={14} alt="" />
                  {dc.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ flexShrink:0, textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
        <div style={{ fontSize:13, fontWeight:600, color:ds.color, display:'flex', alignItems:'center', gap:6 }}>
          <Img src={IC(ds.icon)} size={16} alt="" />{ds.label}
        </div>
        <div style={{ fontSize:12, color:'#6a6a80', display:'flex', alignItems:'center', gap:5 }}>
          <Img src={IC('location-pin.png')} size={13} alt="" />Stop #{r.stop}
        </div>
      </div>
    </div>
  );
};

const RecipientList = ({ recipients, onSelect }) => {
  const [search, setSearch] = React.useState('');
  const filtered = recipients.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.address.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={rlS.panel}>
      <div style={rlS.searchWrap}>
        <Img src={IC('magnifying-glass.png')} size={22} alt="Search" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search recipients..." style={rlS.search} />
        {search && (
          <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
            <Img src={IC('close-x.png')} size={16} alt="Clear" />
          </button>
        )}
      </div>
      <div style={rlS.list}>
        {filtered.map(r => <RecipientRow key={r.id} r={r} onSelect={onSelect} />)}
        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:'#6a6a80', fontSize:14, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <Img src={IC('magnifying-glass.png')} size={48} alt="" />
            No recipients match your search.
          </div>
        )}
      </div>
    </div>
  );
};

const rlS = {
  panel: { background:'#fff', borderRadius:12, border:'1.5px solid rgba(24,24,60,0.13)', overflow:'hidden' },
  searchWrap: { display:'flex', alignItems:'center', gap:10, padding:'13px 16px', borderBottom:'1.5px solid rgba(24,24,60,0.09)' },
  search: { flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'DM Sans',sans-serif", fontSize:15, color:'#1c1c2e' },
  list: { maxHeight:420, overflowY:'auto' },
  row: { display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px', borderBottom:'1.5px solid rgba(24,24,60,0.07)', cursor:'pointer', transition:'background 120ms' },
  avatar: { width:44, height:44, borderRadius:999, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, color:'#1c1c2e', border:'1.5px solid rgba(24,24,60,0.1)' },
  name: { fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600, color:'#1c1c2e' },
  addr: { fontSize:12, color:'#6a6a80', marginTop:2 },
};

Object.assign(window, { RecipientList, RecipientRow, rlS });
