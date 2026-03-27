import { useState, useEffect } from "react";
import "../styles/Comentarios.css";

export default function Comentarios({ projectId, currentUser }) {
  const [comments,    setComments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("Todos");
  const [newText,     setNewText]     = useState("");
  const [posting,     setPosting]     = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText,   setReplyText]   = useState("");
  const [flash,       setFlash]       = useState(false);

  useEffect(() => {
    // TODO: GET /api/projects/:projectId/comments  (o  /api/comments si son globales)
    // const res  = await fetch(`/api/comments${projectId ? `?projectId=${projectId}` : ""}`);
    // const data = await res.json();
    // setComments(data);
    setLoading(false);
  }, [projectId]);

  // Lista de proyectos únicos para los filtros
  const projectNames = [...new Set(comments.map(c => c.projectName).filter(Boolean))];
  const filterOpts   = ["Todos", ...projectNames, "Resueltos"];

  const filtered =
    filter === "Resueltos" ? comments.filter(c => c.resolved) :
    filter === "Todos"     ? comments :
    comments.filter(c => c.projectName === filter);

  // ── Agregar comentario ────────────────────────────────────────────
  const addComment = async () => {
    if (!newText.trim()) return;
    setPosting(true);

    // TODO: POST /api/comments
    // const res  = await fetch("/api/comments", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ text: newText.trim(), projectId }),
    // });
    // const data = await res.json();
    // setComments(prev => [data, ...prev]);

    const initials = currentUser?.name
      ? currentUser.name.slice(0, 2).toUpperCase()
      : "TÚ";

    setComments(prev => [{
      id:          Date.now(),
      initials,
      name:        currentUser?.name || "Tú",
      time:        "Ahora",
      projectName: filter !== "Todos" && filter !== "Resueltos" ? filter : "",
      text:        newText.trim(),
      resolved:    false,
      replies:     [],
    }, ...prev]);

    setNewText("");
    setPosting(false);
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  };

  // ── Resolver / reabrir ────────────────────────────────────────────
  const resolve = async (id) => {
    const comment = comments.find(c => c.id === id);
    // TODO: PATCH /api/comments/:id  { resolved: !comment.resolved }
    // await fetch(`/api/comments/${id}`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ resolved: !comment.resolved }),
    // });
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, resolved: !c.resolved } : c
    ));
  };

  // ── Responder ─────────────────────────────────────────────────────
  const submitReply = async (id) => {
    if (!replyText.trim()) return;

    // TODO: POST /api/comments/:id/replies  { text: replyText }
    // const res  = await fetch(`/api/comments/${id}/replies`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ text: replyText.trim() }),
    // });
    // const data = await res.json();

    setComments(prev => prev.map(c =>
      c.id === id
        ? { ...c, replies: [...c.replies, {
            text: replyText.trim(),
            name: currentUser?.name || "Tú",
            time: "Ahora",
          }]}
        : c
    ));
    setReplyText("");
    setReplyTarget(null);
  };

  return (
    <>
      <div className="page-h">Comentarios</div>
      <div className="page-sub">Conversaciones y notas del equipo sobre tus guiones.</div>

      {/* ── Nuevo comentario ── */}
      <div className="cm-new">
        <textarea
          className="cm-new-input"
          placeholder="Escribe un comentario nuevo…"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          rows={2}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) addComment(); }}
        />
        <button className="btn-gold sm" onClick={addComment} disabled={posting || !newText.trim()}>
          {flash ? "✓ Agregado" : posting ? "Enviando…" : "＋ Comentar"}
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="fbar" style={{ marginTop: 16 }}>
        {filterOpts.map(p => (
          <button key={p} className={`fbtn ${filter === p ? "on" : ""}`}
            onClick={() => setFilter(p)}>
            {p === "Resueltos" ? "✓ Resueltos" : p}
          </button>
        ))}
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="empty-state">Cargando comentarios…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <div className="empty-title">Sin comentarios aquí</div>
          <div className="empty-sub">Sé el primero en dejar un comentario.</div>
        </div>
      ) : (
        <div className="cm-list">
          {filtered.map(c => (
            <div className={`cm-card ${c.resolved ? "cm-resolved" : ""}`} key={c.id}>
              <div className="cm-head">
                <div className="cm-av">{c.initials}</div>
                <div>
                  <div className="cm-author">{c.name}</div>
                  <div className="cm-time">{c.time}</div>
                </div>
                {c.projectName && <span className="cm-proj">{c.projectName}</span>}
                {c.resolved && <span className="cm-resolved-badge">✓ Resuelto</span>}
              </div>

              <div className="cm-text">{c.text}</div>

              {c.replies.length > 0 && (
                <div className="cm-replies">
                  {c.replies.map((r, i) => (
                    <div className="cm-reply" key={i}>
                      <span className="cm-reply-name">{r.name}</span>
                      <span className="cm-reply-time"> · {r.time}</span>
                      <div className="cm-reply-text">{r.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {replyTarget === c.id && (
                <div className="cm-reply-box">
                  <input
                    className="cm-reply-input"
                    placeholder="Escribe una respuesta…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitReply(c.id)}
                    autoFocus
                  />
                  <button className="cm-reply-send" onClick={() => submitReply(c.id)}>Enviar</button>
                  <button className="cm-reply-cancel" onClick={() => setReplyTarget(null)}>✕</button>
                </div>
              )}

              <div className="cm-foot">
                <button className="cm-act"
                  onClick={() => { setReplyTarget(replyTarget === c.id ? null : c.id); setReplyText(""); }}>
                  💬 {replyTarget === c.id ? "Cancelar" : "Responder"}
                </button>
                <button className="cm-act" onClick={() => resolve(c.id)}>
                  {c.resolved ? "↩ Reabrir" : "✓ Resolver"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}