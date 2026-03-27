import { useState, useRef, useEffect } from "react";
import "../styles/Dashboard.css";

import Inicio      from "./Inicio";
import Proyectos   from "./Proyectos";
import Escenas     from "./Escenas";
import Personajes  from "./Personajes";
import Comentarios from "./Comentarios";
import Versiones   from "./Versiones";
import Editor      from "./Editor";

const NAV = [
  { icon: "🏠", label: "Inicio"      },
  { icon: "📁", label: "Proyectos"   },
  { icon: "🎭", label: "Escenas"     },
  { icon: "💬", label: "Comentarios" },
  { icon: "👤", label: "Personajes"  },
  { icon: "📋", label: "Versiones"   },
];

function useOutsideClick(ref, callback) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) callback(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, callback]);
}

export default function Dashboard({ onLogout, usuario }) {
  const [nav,      setNav]      = useState("Inicio");
  const [edKey,    setEdKey]    = useState(0);
  const [edData,   setEdData]   = useState(null);

  // ── Datos desde el backend ────────────────────────────────────────
  const [projects,  setProjects]  = useState([]);
  const [collabs,   setCollabs]   = useState([]);
  const [activity,  setActivity]  = useState([]);
  const [notifs,    setNotifs]    = useState([]);
  const [loadingRP, setLoadingRP] = useState(true);

  useEffect(() => {
    // TODO: GET /api/dashboard  (o llamadas paralelas)
    // const [projRes, collabRes, actRes, notifRes] = await Promise.all([
    //   fetch("/api/projects"),
    //   fetch("/api/team"),
    //   fetch("/api/activity"),
    //   fetch("/api/notifications"),
    // ]);
    // setProjects(await projRes.json());
    // setCollabs(await collabRes.json());
    // setActivity(await actRes.json());
    // setNotifs(await notifRes.json());
    setLoadingRP(false);
  }, []);

  // ── Búsqueda ──────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [query,      setQuery]      = useState("");
  const searchRef   = useRef(null);
  const searchInput = useRef(null);
  useOutsideClick(searchRef, () => { setShowSearch(false); setQuery(""); });

  // Búsqueda local sobre proyectos cargados (luego puede ser /api/search?q=...)
  const results = query.trim().length > 0
    ? projects
        .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
        .map(p => ({ type: "Proyecto", label: p.name, nav: "Proyectos" }))
    : [];

  const openSearch = () => { setShowSearch(true); setTimeout(() => searchInput.current?.focus(), 50); };

  // ── Notificaciones ────────────────────────────────────────────────
  const [showNotifs, setShowNotifs] = useState(false);
  const notifsRef = useRef(null);
  useOutsideClick(notifsRef, () => setShowNotifs(false));
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = async () => {
    // TODO: POST /api/notifications/read-all
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id) => {
    // TODO: PATCH /api/notifications/:id  { read: true }
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // ── Avatar / menú ─────────────────────────────────────────────────
  const [showAvatar, setShowAvatar] = useState(false);
  const avatarRef = useRef(null);
  useOutsideClick(avatarRef, () => setShowAvatar(false));
  const iniciales = usuario?.nombre ? usuario.nombre.slice(0, 2).toUpperCase() : "??";

  // ── Perfil ────────────────────────────────────────────────────────
  const [showPerfil, setShowPerfil] = useState(false);
  const [perfilData, setPerfilData] = useState({
    nombre:    usuario?.nombre || "",
    email:     usuario?.email  || "",
    rol:       usuario?.rol    || "",
    bio:       "",
    password:  "",
    password2: "",
  });
  const [perfilFlash, setPerfilFlash] = useState("");
  const [perfilErr,   setPerfilErr]   = useState("");

  const savePerfil = async () => {
    if (!perfilData.nombre.trim()) { setPerfilErr("El nombre es obligatorio."); return; }
    if (perfilData.password && perfilData.password !== perfilData.password2) {
      setPerfilErr("Las contraseñas no coinciden."); return;
    }
    // TODO: PUT /api/users/me  { nombre, email, rol, bio, password }
    setPerfilErr("");
    setPerfilFlash("✓ Cambios guardados");
    setTimeout(() => setPerfilFlash(""), 2000);
  };

  // ── Configuración ─────────────────────────────────────────────────
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    idioma:       "Español",
    notifEmail:   true,
    notifPush:    false,
    autoguardado: true,
    formatoGuion: "Estándar Hollywood",
    privacidad:   "Solo equipo",
  });
  const [configFlash, setConfigFlash] = useState("");

  const saveConfig = async () => {
    // TODO: PUT /api/users/me/settings  { ...config }
    setConfigFlash("✓ Configuración guardada");
    setTimeout(() => setConfigFlash(""), 2000);
  };

  // ── Ayuda ─────────────────────────────────────────────────────────
  const [showAyuda, setShowAyuda] = useState(false);

  // ── Invitar colaborador ───────────────────────────────────────────
  const [invModal, setInvModal] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole,  setInvRole]  = useState("Guionista");
  const [invFlash, setInvFlash] = useState(false);
  const [invErr,   setInvErr]   = useState("");

  const sendInvite = async () => {
    if (!invEmail.trim() || !/\S+@\S+\.\S+/.test(invEmail)) {
      setInvErr("Ingresa un correo válido."); return;
    }
    // TODO: POST /api/team/invite  { email: invEmail, role: invRole }
    // const res  = await fetch("/api/team/invite", { method:"POST", ... });
    // const data = await res.json();
    // setCollabs(prev => [...prev, data]);
    const initials = invEmail.slice(0, 2).toUpperCase();
    setCollabs(prev => [...prev, { id: Date.now(), i: initials, name: invEmail, role: invRole, g: false }]);
    setInvFlash(true); setInvEmail(""); setInvErr("");
    setTimeout(() => { setInvFlash(false); setInvModal(false); }, 1500);
  };

  const removeCollab = async (id) => {
    // TODO: DELETE /api/team/:id
    setCollabs(prev => prev.filter(c => c.id !== id));
  };

  // ── Editor ────────────────────────────────────────────────────────
  const openEditor  = (title, template) => {
    setEdKey(k => k + 1);
    setEdData({ title: title || "Sin título", template: template || null });
  };
  const closeEditor = () => setEdData(null);
  const isEditor    = edData !== null;

  const renderView = () => {
    switch (nav) {
      case "Proyectos":   return <Proyectos   onEdit={openEditor} />;
      case "Escenas":     return <Escenas     projects={projects} />;
      case "Personajes":  return <Personajes  projects={projects} />;
      case "Comentarios": return <Comentarios currentUser={usuario} />;
      case "Versiones":   return <Versiones   />;
      default:            return <Inicio      onEdit={openEditor} />;
    }
  };

  // ── Estilos reutilizables ─────────────────────────────────────────
  const modalOverlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  };
  const modalBox = {
    background: "var(--card-bg,#1a1a2e)", border: "1px solid var(--border,#2a2a3e)",
    borderRadius: "14px", width: "460px", maxWidth: "95vw", maxHeight: "90vh",
    overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
  };
  const modalHead  = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 22px", borderBottom:"1px solid var(--border,#2a2a3e)" };
  const modalTitle = { fontWeight:700, fontSize:"16px", color:"var(--text,#e0e0e0)" };
  const closeBtn   = { background:"none", border:"none", color:"var(--muted,#888)", fontSize:"18px", cursor:"pointer" };
  const fieldLabel = { fontSize:"11px", color:"var(--muted2,#aaa)", marginBottom:5, display:"block" };
  const fieldInput = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid var(--border,#2a2a3e)", borderRadius:"8px", padding:"9px 12px", color:"var(--text,#e0e0e0)", fontSize:"13px", outline:"none", boxSizing:"border-box" };
  const toggleRow  = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border,#2a2a3e)" };

  return (
    <div className="shell"
      style={{ gridTemplateColumns: isEditor ? "var(--sidebar-w) 1fr" : "var(--sidebar-w) 1fr 300px", height: "100vh" }}>

      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-icon">F</div>
          <span className="brand-name">FILMSCRIPT</span>
        </div>
        <div className="topbar-mid">
          {isEditor
            ? <strong>EDITOR DE GUION</strong>
            : <>BIENVENIDO,&nbsp;<strong>{usuario?.nombre?.toUpperCase() || "USUARIO"}.</strong></>}
        </div>

        <div className="topbar-actions">
          {isEditor && <button className="t-icon" onClick={closeEditor} style={{ fontWeight: 700 }}>✕</button>}

          {/* Notificaciones */}
          <div style={{ position: "relative" }} ref={notifsRef}>
            <div className="t-icon" style={{ position: "relative", cursor: "pointer" }}
              onClick={() => { setShowNotifs(p => !p); setShowSearch(false); setShowAvatar(false); }}>
              🔔
              {unreadCount > 0 && (
                <span style={{ position:"absolute", top:"-4px", right:"-4px", background:"var(--gold,#c9a84c)", color:"#000", borderRadius:"50%", fontSize:"10px", fontWeight:700, width:"16px", height:"16px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {showNotifs && (
              <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"var(--card-bg,#1a1a2e)", border:"1px solid var(--border,#2a2a3e)", borderRadius:"10px", width:"300px", zIndex:999, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:"1px solid var(--border,#2a2a3e)" }}>
                  <span style={{ fontWeight:700, fontSize:"13px" }}>Notificaciones</span>
                  {unreadCount > 0 && (
                    <span style={{ fontSize:"11px", color:"var(--gold,#c9a84c)", cursor:"pointer" }} onClick={markAllRead}>
                      Marcar todas como leídas
                    </span>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div style={{ padding:"24px 16px", textAlign:"center", color:"var(--muted,#888)", fontSize:"13px" }}>
                    Sin notificaciones
                  </div>
                ) : notifs.map(n => (
                  <div key={n.id} onClick={() => markRead(n.id)}
                    style={{ display:"flex", gap:"10px", padding:"12px 16px", cursor:"pointer", background:n.read?"transparent":"rgba(201,168,76,0.06)", borderBottom:"1px solid var(--border,#2a2a3e)" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"var(--gold,#c9a84c)", color:"#000", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:700, flexShrink:0 }}>
                      {n.i}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"12px", color:"var(--text,#e0e0e0)", lineHeight:1.4 }}>{n.txt}</div>
                      <div style={{ fontSize:"11px", color:"var(--muted,#888)", marginTop:3 }}>{n.t}</div>
                    </div>
                    {!n.read && <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"var(--gold,#c9a84c)", flexShrink:0, marginTop:4 }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Búsqueda */}
          <div style={{ position:"relative" }} ref={searchRef}>
            <div className="t-icon" style={{ cursor:"pointer" }}
              onClick={() => { openSearch(); setShowNotifs(false); setShowAvatar(false); }}>🔍</div>
            {showSearch && (
              <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"var(--card-bg,#1a1a2e)", border:"1px solid var(--border,#2a2a3e)", borderRadius:"10px", width:"280px", zIndex:999, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ padding:"10px 12px", borderBottom:"1px solid var(--border,#2a2a3e)" }}>
                  <input ref={searchInput} value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar proyectos, escenas, personajes…"
                    style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:"var(--text,#e0e0e0)", fontSize:"13px" }} />
                </div>
                {query.trim().length > 0 ? (
                  <div style={{ maxHeight:"220px", overflowY:"auto" }}>
                    {results.length > 0 ? results.map((r, idx) => (
                      <div key={idx}
                        onClick={() => { setNav(r.nav); setShowSearch(false); setQuery(""); closeEditor(); }}
                        style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid var(--border,#2a2a3e)" }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(201,168,76,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <span style={{ fontSize:"16px" }}>📁</span>
                        <div>
                          <div style={{ fontSize:"13px", color:"var(--text,#e0e0e0)" }}>{r.label}</div>
                          <div style={{ fontSize:"11px", color:"var(--muted,#888)" }}>{r.type}</div>
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding:"16px", textAlign:"center", color:"var(--muted,#888)", fontSize:"13px" }}>
                        Sin resultados para "{query}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:"11px", color:"var(--muted,#888)", marginBottom:8 }}>Accesos rápidos</div>
                    {["Proyectos","Escenas","Personajes"].map(s => (
                      <div key={s}
                        onClick={() => { setNav(s); setShowSearch(false); closeEditor(); }}
                        style={{ padding:"7px 0", cursor:"pointer", fontSize:"13px", color:"var(--text,#e0e0e0)", display:"flex", alignItems:"center", gap:8 }}
                        onMouseEnter={e => e.currentTarget.style.color="var(--gold,#c9a84c)"}
                        onMouseLeave={e => e.currentTarget.style.color="var(--text,#e0e0e0)"}>
                        {s==="Proyectos"?"📁":s==="Escenas"?"🎭":"👤"} {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Avatar */}
          <div style={{ position:"relative" }} ref={avatarRef}>
            <div className="avatar" style={{ cursor:"pointer" }}
              onClick={() => { setShowAvatar(p => !p); setShowNotifs(false); setShowSearch(false); }}>
              {iniciales}
            </div>
            {showAvatar && (
              <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, background:"var(--card-bg,#1a1a2e)", border:"1px solid var(--border,#2a2a3e)", borderRadius:"10px", width:"220px", zIndex:999, boxShadow:"0 8px 32px rgba(0,0,0,0.4)", overflow:"hidden" }}>
                <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border,#2a2a3e)", background:"rgba(201,168,76,0.06)" }}>
                  <div style={{ fontWeight:700, fontSize:"14px", color:"var(--text,#e0e0e0)" }}>{usuario?.nombre || "Usuario"}</div>
                  <div style={{ fontSize:"11px", color:"var(--muted,#888)", marginTop:2 }}>{usuario?.email || ""}</div>
                </div>
                {[
                  { icon:"👤", label:"Mi perfil",     action:() => { setShowPerfil(true); setShowAvatar(false); } },
                  { icon:"⚙️", label:"Configuración", action:() => { setShowConfig(true); setShowAvatar(false); } },
                  { icon:"❓", label:"Ayuda",          action:() => { setShowAyuda(true);  setShowAvatar(false); } },
                ].map(item => (
                  <div key={item.label} onClick={item.action}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", cursor:"pointer", fontSize:"13px", color:"var(--text,#e0e0e0)" }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(201,168,76,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    {item.icon} {item.label}
                  </div>
                ))}
                <div style={{ borderTop:"1px solid var(--border,#2a2a3e)" }}>
                  <div onClick={onLogout}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", cursor:"pointer", fontSize:"13px", color:"#e05c5c" }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(224,92,92,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    ⏻ Cerrar sesión
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-section">
          {NAV.map(item => (
            <button key={item.label}
              className={`nav-btn ${!isEditor && nav === item.label ? "active" : ""}`}
              onClick={() => { setNav(item.label); closeEditor(); }}>
              <span className="ni">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-gap" />
        <div className="sidebar-foot">
          <button className="nav-btn" onClick={() => setShowConfig(true)}><span className="ni">⚙️</span>Configuración</button>
          <button className="nav-btn" onClick={onLogout}><span className="ni">⏻</span>Salir</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      {isEditor ? (
        <main style={{ overflow:"hidden", display:"flex", flexDirection:"column", background:"var(--ed-bg)", minHeight:0, height:"100%" }}>
          <Editor key={edKey} initTitle={edData.title} initTemplate={edData.template} onBack={closeEditor} />
        </main>
      ) : (
        <main className="main">{renderView()}</main>
      )}

      {/* ── RIGHT PANEL ── */}
      {!isEditor && (
        <aside className="rpanel">
          <div className="rp-sec">
            <div className="rp-head">
              <div className="rp-ttl">Equipo</div>
              <button className="rp-act">⚙ ▾</button>
            </div>
            <div className="sc-add">
              <button className="btn-sc" onClick={() => { setNav("Proyectos"); openEditor("Sin título", null); }}>
                ＋ Nuevo guión
              </button>
            </div>

            {loadingRP ? (
              <div style={{ padding:"12px", fontSize:"12px", color:"var(--muted)" }}>Cargando equipo…</div>
            ) : collabs.length === 0 ? (
              <div style={{ padding:"12px 0", fontSize:"12px", color:"var(--muted)", textAlign:"center" }}>
                Sin colaboradores todavía
              </div>
            ) : collabs.map(c => (
              <div className="cl-row" key={c.id}>
                <div className="cl-av">{c.i}</div>
                <div className="cl-info">
                  <div className={`cl-name ${c.g ? "g" : ""}`}>{c.name}</div>
                  <div className="cl-role">{c.role}</div>
                </div>
                {!c.g && (
                  <span style={{ color:"var(--muted)", cursor:"pointer", fontSize:"16px" }}
                    onClick={() => removeCollab(c.id)} title="Quitar">✕</span>
                )}
              </div>
            ))}

            <button className="btn-inv" onClick={() => { setInvModal(true); setInvEmail(""); setInvErr(""); }}>
              ☰ Invitar colaborador
            </button>
          </div>

          <div className="rp-sec">
            <div className="rp-head">
              <div className="rp-ttl">Actividad reciente</div>
            </div>
            {loadingRP ? (
              <div style={{ padding:"12px", fontSize:"12px", color:"var(--muted)" }}>Cargando actividad…</div>
            ) : activity.length === 0 ? (
              <div style={{ padding:"12px 0", fontSize:"12px", color:"var(--muted)", textAlign:"center" }}>
                Sin actividad reciente
              </div>
            ) : activity.map((a, i) => (
              <div className="ac-item" key={i}>
                <div className="ac-av">{a.i}</div>
                <div className="ac-body">
                  <div className="ac-head">
                    <span className="ac-name">{a.name}</span>
                    <span className="ac-time">{a.t}</span>
                  </div>
                  <div className="ac-text">{a.txt}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ── MODAL MI PERFIL ── */}
      {showPerfil && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setShowPerfil(false)}>
          <div style={modalBox}>
            <div style={modalHead}>
              <span style={modalTitle}>👤 Mi perfil</span>
              <button style={closeBtn} onClick={() => setShowPerfil(false)}>✕</button>
            </div>
            <div style={{ padding:"22px" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:24 }}>
                <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:"var(--gold,#c9a84c)", color:"#000", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", fontWeight:700, marginBottom:10 }}>
                  {iniciales}
                </div>
              </div>
              {[
                { label:"Nombre",             key:"nombre",   type:"text"     },
                { label:"Correo electrónico", key:"email",    type:"email"    },
                { label:"Rol en el proyecto", key:"rol",      type:"text"     },
                { label:"Biografía",          key:"bio",      type:"textarea" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label style={fieldLabel}>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea value={perfilData[f.key]}
                      onChange={e => setPerfilData(p => ({ ...p, [f.key]: e.target.value }))}
                      rows={3} style={{ ...fieldInput, resize:"vertical" }} />
                  ) : (
                    <input type={f.type} value={perfilData[f.key]}
                      onChange={e => setPerfilData(p => ({ ...p, [f.key]: e.target.value }))}
                      style={fieldInput} />
                  )}
                </div>
              ))}
              <div style={{ borderTop:"1px solid var(--border,#2a2a3e)", paddingTop:16, marginBottom:14 }}>
                <div style={{ fontSize:"12px", fontWeight:600, color:"var(--text,#e0e0e0)", marginBottom:12 }}>Cambiar contraseña</div>
                {[["Nueva contraseña","password"],["Confirmar contraseña","password2"]].map(([lbl,key]) => (
                  <div key={key} style={{ marginBottom:12 }}>
                    <label style={fieldLabel}>{lbl}</label>
                    <input type="password" value={perfilData[key]}
                      onChange={e => setPerfilData(p => ({ ...p, [key]: e.target.value }))}
                      style={fieldInput} />
                  </div>
                ))}
              </div>
              {perfilErr   && <div style={{ fontSize:"12px", color:"#e05c5c", marginBottom:10 }}>⚠ {perfilErr}</div>}
              {perfilFlash && <div style={{ fontSize:"12px", color:"#5ce07a", marginBottom:10 }}>{perfilFlash}</div>}
              <button onClick={savePerfil} style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"none", background:"var(--gold,#c9a84c)", color:"#000", fontWeight:700, fontSize:"13px", cursor:"pointer" }}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIGURACIÓN ── */}
      {showConfig && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setShowConfig(false)}>
          <div style={modalBox}>
            <div style={modalHead}>
              <span style={modalTitle}>⚙️ Configuración</span>
              <button style={closeBtn} onClick={() => setShowConfig(false)}>✕</button>
            </div>
            <div style={{ padding:"22px" }}>
              {[
                { label:"Idioma",            key:"idioma",       opts:["Español","English","Français","Português"] },
                { label:"Formato de guion",  key:"formatoGuion", opts:["Estándar Hollywood","Europeo","Documental","Serie TV"] },
                { label:"Privacidad",        key:"privacidad",   opts:["Solo yo","Solo equipo","Público"] },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:16 }}>
                  <label style={fieldLabel}>{f.label}</label>
                  <select value={config[f.key]}
                    onChange={e => setConfig(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ ...fieldInput, cursor:"pointer" }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ borderTop:"1px solid var(--border,#2a2a3e)", paddingTop:16 }}>
                <div style={{ fontSize:"12px", fontWeight:600, color:"var(--text,#e0e0e0)", marginBottom:12 }}>Notificaciones y guardado</div>
                {[
                  { label:"Notificaciones por email", key:"notifEmail"   },
                  { label:"Notificaciones push",      key:"notifPush"    },
                  { label:"Autoguardado",             key:"autoguardado" },
                ].map(t => (
                  <div key={t.key} style={toggleRow}>
                    <span style={{ fontSize:"13px", color:"var(--text,#e0e0e0)" }}>{t.label}</span>
                    <div onClick={() => setConfig(p => ({ ...p, [t.key]: !p[t.key] }))}
                      style={{ width:"42px", height:"24px", borderRadius:"12px", cursor:"pointer", background:config[t.key]?"var(--gold,#c9a84c)":"var(--border,#2a2a3e)", position:"relative", transition:"background 0.2s" }}>
                      <div style={{ position:"absolute", top:"3px", left:config[t.key]?"21px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
                    </div>
                  </div>
                ))}
              </div>
              {configFlash && <div style={{ fontSize:"12px", color:"#5ce07a", margin:"12px 0" }}>✓ {configFlash}</div>}
              <button onClick={saveConfig} style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"none", background:"var(--gold,#c9a84c)", color:"#000", fontWeight:700, fontSize:"13px", cursor:"pointer", marginTop:16 }}>
                Guardar configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AYUDA ── */}
      {showAyuda && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setShowAyuda(false)}>
          <div style={modalBox}>
            <div style={modalHead}>
              <span style={modalTitle}>❓ Ayuda</span>
              <button style={closeBtn} onClick={() => setShowAyuda(false)}>✕</button>
            </div>
            <div style={{ padding:"22px" }}>
              {[
                { q:"¿Cómo creo un nuevo proyecto?",  a:"Ve a la sección Proyectos y haz clic en '+ Nuevo proyecto'." },
                { q:"¿Cómo invito a un colaborador?", a:"En el panel derecho encontrarás el botón 'Invitar colaborador'." },
                { q:"¿Cómo uso el editor de guion?",  a:"Haz clic en cualquier proyecto o escena y se abrirá el editor." },
                { q:"¿Puedo exportar mi guion?",      a:"Sí, dentro del editor encontrarás la opción de exportar." },
                { q:"¿Cómo contacto al soporte?",    a:"Escríbenos al correo de soporte que aparece abajo." },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom: i < 4 ? "1px solid var(--border,#2a2a3e)" : "none" }}>
                  <div style={{ fontWeight:600, fontSize:"13px", color:"var(--gold,#c9a84c)", marginBottom:6 }}>{item.q}</div>
                  <div style={{ fontSize:"13px", color:"var(--text,#e0e0e0)", lineHeight:1.5 }}>{item.a}</div>
                </div>
              ))}
              <div style={{ marginTop:8, padding:"12px", borderRadius:"8px", background:"rgba(201,168,76,0.08)", border:"1px solid var(--border,#2a2a3e)" }}>
                <div style={{ fontSize:"12px", color:"var(--muted,#888)" }}>
                  ¿Necesitas más ayuda?{" "}
                  <span style={{ color:"var(--gold,#c9a84c)" }}>soporte@filmscript.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL INVITAR ── */}
      {invModal && (
        <div className="inv-overlay" onClick={e => e.target === e.currentTarget && setInvModal(false)}>
          <div className="inv-modal">
            <button className="inv-close" onClick={() => setInvModal(false)}>✕</button>
            <div className="inv-title">Invitar colaborador</div>
            <div className="inv-sub">El colaborador recibirá un correo con acceso al proyecto.</div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:"11px", color:"var(--muted2)", marginBottom:5 }}>Correo electrónico</div>
              <input className="inv-input" type="email" placeholder="colaborador@correo.com"
                value={invEmail}
                onChange={e => { setInvEmail(e.target.value); setInvErr(""); }}
                onKeyDown={e => e.key === "Enter" && sendInvite()} autoFocus />
              {invErr && <div style={{ fontSize:"11px", color:"var(--red)", marginTop:4 }}>⚠ {invErr}</div>}
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:"11px", color:"var(--muted2)", marginBottom:5 }}>Rol</div>
              <select className="inv-sel" value={invRole} onChange={e => setInvRole(e.target.value)}>
                <option>Guionista</option>
                <option>Director</option>
                <option>Editor</option>
                <option>Lector</option>
              </select>
            </div>
            <button className="btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={sendInvite}>
              {invFlash ? "✓ Invitación enviada" : "📨 Enviar invitación"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}