// Header.jsx — Mealflo Coordinator Web App Header

const IC = name => `../../assets/icons/${name}`;

const Img = ({ src, size=20, alt='' }) => (
  <img src={src} alt={alt} style={{ width:size, height:size, objectFit:'contain', flexShrink:0 }} />
);

const Header = ({ currentPage, onNav, notifCount = 2 }) => {
  const navItems = [
    { id:'dashboard',  label:'Dashboard',  icon:'home-house.png' },
    { id:'routes',     label:'Routes',     icon:'delivery-van.png' },
    { id:'recipients', label:'Recipients', icon:'checklist.png' },
    { id:'volunteers', label:'Volunteers', icon:'group.png' },
    { id:'schedule',   label:'Schedule',   icon:'calendar.png' },
  ];

  return (
    <header style={hS.header}>
      <div style={hS.logo}>
        <Img src={IC('meal-container.png')} size={32} alt="Mealflo" />
        <span style={hS.logoText}>Mealflo</span>
      </div>
      <nav style={hS.nav}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)}
            style={{ ...hS.navBtn, ...(currentPage === item.id ? hS.navBtnActive : {}) }}>
            <Img src={IC(item.icon)} size={20} alt="" />
            {item.label}
          </button>
        ))}
      </nav>
      <div style={hS.right}>
        <button style={hS.iconBtn} title="Notifications">
          <Img src={IC('notification-bell.png')} size={26} alt="Notifications" />
          {notifCount > 0 && <span style={hS.badge}>{notifCount}</span>}
        </button>
        <div style={hS.avatar}>SC</div>
      </div>
    </header>
  );
};

const hS = {
  header: { height:64, background:'#fae278', borderBottom:'1.5px solid rgba(170,120,0,0.35)', display:'flex', alignItems:'center', padding:'0 24px', position:'sticky', top:0, zIndex:100, flexShrink:0 },
  logo: { display:'flex', alignItems:'center', gap:10, marginRight:28, flexShrink:0 },
  logoText: { fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:22, color:'#1c1c2e', letterSpacing:'-0.02em' },
  nav: { display:'flex', gap:2, flex:1 },
  navBtn: { display:'flex', alignItems:'center', gap:7, height:42, padding:'0 14px', borderRadius:8, background:'transparent', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500, color:'#3a3a1e', transition:'background 150ms' },
  navBtnActive: { background:'rgba(255,255,255,0.72)', color:'#1c1c2e', fontWeight:600, border:'1.5px solid rgba(170,120,0,0.4)' },
  right: { display:'flex', alignItems:'center', gap:12, flexShrink:0 },
  iconBtn: { width:42, height:42, borderRadius:8, background:'rgba(255,255,255,0.5)', border:'1.5px solid rgba(170,120,0,0.35)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' },
  badge: { position:'absolute', top:-4, right:-4, background:'#9b1c1c', color:'#fff', fontSize:10, fontWeight:700, borderRadius:999, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', fontFamily:"'DM Sans',sans-serif" },
  avatar: { width:38, height:38, borderRadius:999, background:'#3d5cf5', color:'#fff', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(50,70,200,0.4)' },
};

Object.assign(window, { Header, hS, Img, IC });
