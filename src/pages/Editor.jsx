import { useState, useRef, useEffect, useCallback } from "react";
import "../styles/Editor.css";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TRANSITIONS = [
  "CORTE A:",
  "FUNDIDO A:",
  "FUNDIDO A NEGRO:",
  "ENCADENADO A:",
  "IRIS A:",
  "DISOLVENCIA A:",
  "SALTO DE CORTE:",
  "CORTE SECO:",
  "SMASH CORTE A:",
];

const MOMENTOS = ["DÍA", "NOCHE", "AMANECER", "ATARDECER", "CONTINUO", "MÁS TARDE"];
const TIPOS    = ["INT.", "EXT.", "INT./EXT."];

const LABELS = {
  credits:    "créditos",
  scene:      "escena",
  action:     "acción",
  char:       "personaje",
  dialog:     "diálogo",
  paren:      "(nota)",
  transition: "transición",
};

const STARTERS = {
  blank: [],
  "Piloto de Serie": [
    { type: "scene",  val: "INT. SALA DE ESPERA — DÍA" },
    { type: "action", val: "El piloto arranca aquí. La primera imagen que el espectador verá." },
    { type: "char",   val: "PERSONAJE" },
    { type: "dialog", val: "El primer diálogo del piloto." },
  ],
  "Corto / Cortometraje": [
    { type: "scene",  val: "EXT. CALLE PRINCIPAL — NOCHE" },
    { type: "action", val: "Una historia breve que comienza con una imagen poderosa." },
    { type: "char",   val: "PROTAGONISTA" },
    { type: "dialog", val: "Una sola frase que lo define todo." },
  ],
  "Película Largometraje": [
    { type: "scene",  val: "INT. HABITACIÓN — AMANECER" },
    { type: "action", val: "FUNDIDO DESDE NEGRO. El mundo del protagonista antes de que todo cambie." },
    { type: "char",   val: "VOZ EN OFF" },
    { type: "paren",  val: "(nostálgico)" },
    { type: "dialog", val: "Dicen que hay momentos que lo cambian todo." },
  ],
  "Publicidad": [
    { type: "scene",  val: "EXT. CIUDAD — DÍA" },
    { type: "action", val: "Plano abierto. La marca aparece integrada en la vida cotidiana." },
    { type: "char",   val: "LOCUTOR" },
    { type: "dialog", val: "El mensaje principal del producto." },
  ],
};

// ─── CREDITS BLOCK ────────────────────────────────────────────────────────────

function CreditsBlock({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div className="sp-credits-page">
      <div className="sp-credits-inner">
        <div className="sp-credits-label">PÁGINA DE CRÉDITOS</div>

        <div className="sp-credits-field">
          <label className="sp-credits-field-lbl">TÍTULO</label>
          <input
            className="sp-credits-title-inp"
            value={data.title}
            placeholder="Título del guion"
            onChange={e => set("title", e.target.value)}
          />
        </div>

        <div className="sp-credits-field">
          <label className="sp-credits-field-lbl">ESCRITO POR</label>
          <input
            className="sp-credits-inp"
            value={data.writer}
            placeholder="Nombre del escritor"
            onChange={e => set("writer", e.target.value)}
          />
        </div>

        <div className="sp-credits-row2">
          <div className="sp-credits-field">
            <label className="sp-credits-field-lbl">FECHA</label>
            <input
              className="sp-credits-inp"
              value={data.date}
              placeholder="Mes, Año"
              onChange={e => set("date", e.target.value)}
            />
          </div>
          <div className="sp-credits-field">
            <label className="sp-credits-field-lbl">VERSIÓN</label>
            <input
              className="sp-credits-inp"
              value={data.version}
              placeholder="Borrador 1"
              onChange={e => set("version", e.target.value)}
            />
          </div>
        </div>

        <div className="sp-credits-field">
          <label className="sp-credits-field-lbl">CONTACTO</label>
          <input
            className="sp-credits-inp"
            value={data.contact}
            placeholder="Correo o teléfono de contacto"
            onChange={e => set("contact", e.target.value)}
          />
        </div>

        <div className="sp-credits-divider" />
        <div className="sp-credits-footer">
          Propiedad de {data.writer || "el autor"} · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}

// ─── SCENE HEADING BLOCK ──────────────────────────────────────────────────────

function SceneHeadingBlock({ val, onChange }) {
  const [tipo,    setTipo]    = useState(() => val.split(".")[0]?.trim() || "INT.");
  const [lugar,   setLugar]   = useState(() => {
    const m = val.match(/^(?:INT\.|EXT\.|INT\.\/EXT\.)\s+(.*?)\s*—\s*(.*?)$/i);
    return m ? m[1] : "";
  });
  const [momento, setMomento] = useState(() => {
    const m = val.match(/—\s*(.+)$/);
    return m ? m[1].trim() : "DÍA";
  });

  useEffect(() => {
    onChange(`${tipo} ${lugar} — ${momento}`);
  }, [tipo, lugar, momento]);

  return (
    <div className="sblk sblk-scene">
      <span className="sblk-lbl">escena</span>
      <div className="sh-row">
        <select className="sh-sel" value={tipo} onChange={e => setTipo(e.target.value)}>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>
        <input
          className="sh-lugar"
          value={lugar}
          placeholder="LOCACIÓN"
          onChange={e => setLugar(e.target.value.toUpperCase())}
        />
        <span className="sh-dash">—</span>
        <select className="sh-sel" value={momento} onChange={e => setMomento(e.target.value)}>
          {MOMENTOS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── TRANSITION BLOCK ─────────────────────────────────────────────────────────

function TransitionBlock({ val, onChange }) {
  const [custom, setCustom] = useState(false);

  return (
    <div className="sblk sblk-trans">
      <span className="sblk-lbl">transición</span>
      <div className="tr-row">
        {!custom ? (
          <>
            <select
              className="tr-sel"
              value={TRANSITIONS.includes(val) ? val : "custom"}
              onChange={e => {
                if (e.target.value === "custom") { setCustom(true); onChange(""); }
                else onChange(e.target.value);
              }}
            >
              {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="custom">Personalizada…</option>
            </select>
          </>
        ) : (
          <>
            <input
              className="tr-inp"
              value={val}
              placeholder="Escribe la transición…"
              onChange={e => onChange(e.target.value.toUpperCase())}
              autoFocus
            />
            <button className="tr-preset-btn" onClick={() => setCustom(false)}>
              ↩ Presets
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GENERIC BLOCK ────────────────────────────────────────────────────────────

function ScriptBlock({ type, val, onChange, onKeyDown }) {
  const ta = useRef(null);

  useEffect(() => {
    if (ta.current) {
      ta.current.style.height = "auto";
      ta.current.style.height = ta.current.scrollHeight + "px";
    }
  }, [val]);

  const placeholders = {
    action:     "Describe la acción. ¿Qué vemos? ¿Qué ocurre?",
    char:       "NOMBRE DEL PERSONAJE",
    dialog:     "El diálogo del personaje…",
    paren:      "(acotación)",
  };

  return (
    <div className={`sblk sblk-${type}`}>
      <span className="sblk-lbl">{LABELS[type]}</span>
      <textarea
        ref={ta}
        rows={1}
        value={val}
        placeholder={placeholders[type] || ""}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

// ─── MAIN EDITOR ──────────────────────────────────────────────────────────────

export default function Editor({ initTitle, initTemplate, onBack }) {
  const key     = initTemplate || "blank";
  const starter = STARTERS[key] || [];

  const initCredits = {
    title:   initTitle || "Sin título",
    writer:  "",
    date:    new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    version: "Borrador 1",
    contact: "",
  };

  const [credits, setCredits] = useState(initCredits);
  const [blocks,  setBlocks]  = useState(() =>
    starter.map((b, i) => ({ id: i, type: b.type, val: b.val }))
  );
  const [nextId,  setNextId]  = useState(starter.length);
  const [saved,   setSaved]   = useState(false);
  const [activeId,setActiveId]= useState(null);

  // Sidebar scene list
  const sceneBlocks = blocks.filter(b => b.type === "scene");
  const wordCount   = blocks.reduce((a, b) => a + b.val.trim().split(/\s+/).filter(Boolean).length, 0);

  const updateVal = useCallback((id, val) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, val } : b)), []);

  const addBlock = (type, afterId = null) => {
    const newBlock = { id: nextId, type, val: type === "transition" ? "CORTE A:" : "" };
    setNextId(n => n + 1);
    if (afterId === null) {
      setBlocks(prev => [...prev, newBlock]);
    } else {
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === afterId);
        const next = [...prev];
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
    }
    setTimeout(() => setActiveId(newBlock.id), 50);
  };

  const removeBlock = id => setBlocks(prev => prev.filter(b => b.id !== id));

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  // Smart Enter key behavior
  const handleKeyDown = (block, e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const nextType =
        block.type === "char"   ? "dialog" :
        block.type === "dialog" ? "char"   :
        block.type === "paren"  ? "dialog" : "action";
      addBlock(nextType, block.id);
    }
  };

  const exportTXT = () => {
  let content = "";

  // Créditos
  content += `${credits.title}\n`;
  content += `Escrito por: ${credits.writer}\n`;
  content += `${credits.date} — ${credits.version}\n`;
  content += `Contacto: ${credits.contact}\n\n`;
  content += "---------------------------------\n\n";

  // Bloques
  blocks.forEach(b => {
    if (b.type === "scene") {
      content += `\n${b.val}\n`;
    } else if (b.type === "char") {
      content += `\n${b.val.toUpperCase()}\n`;
    } else if (b.type === "dialog") {
      content += `${b.val}\n`;
    } else if (b.type === "transition") {
      content += `\n${b.val}\n`;
    } else {
      content += `${b.val}\n`;
    }
  });

  // Descargar
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${credits.title || "guion"}.txt`;
  a.click();

  URL.revokeObjectURL(url);
};

const exportDOCX = async () => {
  const children = [];

  // 🎬 Créditos
  children.push(
    new Paragraph({
      children: [new TextRun({ text: credits.title, bold: true, size: 32 })],
      spacing: { after: 300 },
    })
  );

  children.push(
    new Paragraph(`Escrito por: ${credits.writer}`)
  );

  children.push(
    new Paragraph(`${credits.date} — ${credits.version}`)
  );

  children.push(new Paragraph(" "));

  // 🎬 Bloques del guion
  blocks.forEach(b => {
    let text = b.val;

    if (b.type === "char") text = text.toUpperCase();
    if (b.type === "scene") text = text.toUpperCase();

    children.push(
      new Paragraph({
        children: [new TextRun(text)],
        spacing: { after: 200 },
      })
    );
  });

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${credits.title || "guion"}.docx`);
};

  return (
    <div className="editor-shell">

      {/* ── LEFT: Scene navigator ─────────────────────────────── */}
      <div className="ed-left">
        <div className="ed-left-top">
          <span className="ed-left-lbl">Escenas</span>
          <button className="ed-plus" onClick={() => addBlock("scene")}>+</button>
        </div>

        {/* Credits shortcut */}
        <div className="ed-sc-item credits-item">
          <div className="ed-sc-n">CR</div>
          <div className="ed-sc-t">Créditos</div>
        </div>

        <div className="ed-sc-list">
          {sceneBlocks.length === 0 && (
            <p style={{ padding: "14px 10px", fontSize: "11px", color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
              Sin escenas aún.<br />Pulsa + para agregar.
            </p>
          )}
          {sceneBlocks.map((s, i) => (
            <div key={s.id} className={`ed-sc-item ${activeId === s.id ? "on" : ""}`}
              onClick={() => setActiveId(s.id)}>
              <div className="ed-sc-n">ESC {String(i + 1).padStart(2, "0")}</div>
              <div className="ed-sc-t">{s.val || "Sin título"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER: Script page ────────────────────────────────── */}
      <div className="ed-center">

        {/* Toolbar */}
        <div className="ed-toolbar">
          <button className="ed-tb-btn" onClick={() => addBlock("scene")}>🎬 Escena</button>
          <div className="ed-tb-sep" />
          <button className="ed-tb-btn" onClick={() => addBlock("action")}>📝 Acción</button>
          <button className="ed-tb-btn" onClick={() => addBlock("char")}>👤 Personaje</button>
          <button className="ed-tb-btn" onClick={() => addBlock("dialog")}>💬 Diálogo</button>
          <button className="ed-tb-btn" onClick={() => addBlock("paren")}>() Paréntesis</button>
          <button className="ed-tb-btn" onClick={() => addBlock("transition")}>⏭ Transición</button>
          <div className="ed-tb-sep" />
          <button onClick={exportTXT}>📄 Exportar TXT</button>
          <button onClick={exportDOCX}>📝 Descargar Word</button>
          <button className="ed-tb-save" onClick={handleSave}>{saved ? "✓ Guardado" : "💾 Guardar"}</button>
        </div>

        {/* Breadcrumb */}
        <div className="ed-crumb">
          <button onClick={onBack}>← Volver</button>
          <span className="sep">/</span>
          <span className="cur">{credits.title}</span>
          {initTemplate && (
            <><span className="sep">·</span>
            <span style={{ color: "var(--muted)" }}>{initTemplate}</span></>
          )}
        </div>

        {/* Script body — the actual screenplay "page" */}
        <div className="ed-body">

          {/* CREDITS PAGE */}
          <CreditsBlock data={credits} onChange={setCredits} />

          {/* PAGE BREAK indicator */}
          <div className="sp-page-break">
            <span>— página 1 —</span>
          </div>

          {/* SCRIPT BLOCKS */}
          {blocks.map(b => (
            <div key={b.id} className="sp-block-wrap"
              onClick={() => setActiveId(b.id)}>

              {b.type === "scene" ? (
                <SceneHeadingBlock val={b.val} onChange={val => updateVal(b.id, val)} />
              ) : b.type === "transition" ? (
                <TransitionBlock val={b.val} onChange={val => updateVal(b.id, val)} />
              ) : (
                <ScriptBlock
                  type={b.type}
                  val={b.val}
                  onChange={val => updateVal(b.id, val)}
                  onKeyDown={e => handleKeyDown(b, e)}
                />
              )}

              {/* Block actions (visible on hover) */}
              <div className="sp-block-actions">
                <button className="sp-bact" title="Eliminar bloque"
                  onClick={e => { e.stopPropagation(); removeBlock(b.id); }}>🗑</button>
                <button className="sp-bact" title="Agregar acción abajo"
                  onClick={e => { e.stopPropagation(); addBlock("action", b.id); }}>＋</button>
              </div>
            </div>
          ))}

          {/* Quick add row */}
          <div className="sp-quick-add">
            {[
              ["🎬", "scene",      "Escena"],
              ["📝", "action",     "Acción"],
              ["👤", "char",       "Personaje"],
              ["💬", "dialog",     "Diálogo"],
              ["()", "paren",      "Paréntesis"],
              ["⏭",  "transition", "Transición"],
            ].map(([ic, tp, lb]) => (
              <button key={tp} className="sp-qa-btn" onClick={() => addBlock(tp)}>
                {ic} {lb}
              </button>
            ))}
          </div>

        </div>

        {/* Status bar */}
        <div className="ed-status">
          <div className="ed-status-dot" />
          <span>{wordCount} palabras</span>
          <span>·</span>
          <span>{blocks.length} bloques</span>
          <span>·</span>
          <span>{sceneBlocks.length} escenas</span>
          <span>·</span>
          <span>~{Math.ceil(wordCount / 200) || 0} pág.</span>
        </div>
      </div>

      {/* ── RIGHT: Properties panel ───────────────────────────── */}
      <div className="ed-right">

        <div className="ed-r-sec">
          <button className="ed-back-btn" onClick={onBack}>← Volver al inicio</button>
          <button className="ed-save-big" onClick={handleSave}>
            {saved ? "✓ Guardado" : "💾 Guardar guion"}
          </button>
        </div>

        {/* Credits quick-edit */}
        <div className="ed-r-sec">
          <div className="ed-r-ttl">Página de créditos</div>
          {[
            ["Título",    "title",   "text"],
            ["Escritor",  "writer",  "text"],
            ["Fecha",     "date",    "text"],
            ["Versión",   "version", "text"],
            ["Contacto",  "contact", "text"],
          ].map(([lbl, key, type]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: "11px", color: "var(--muted2)", marginBottom: 4 }}>{lbl}</div>
              <input
                className="ed-inp"
                type={type}
                value={credits[key]}
                onChange={e => setCredits(c => ({ ...c, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {/* Project properties */}
        <div className="ed-r-sec">
          <div className="ed-r-ttl">Propiedades</div>
          <div style={{ fontSize: "11px", color: "var(--muted2)", marginBottom: 5 }}>Tipo</div>
          <select className="ed-sel" defaultValue={initTemplate || "Largometraje"}>
            <option>Largometraje</option>
            <option>Cortometraje</option>
            <option>Piloto de Serie</option>
            <option>Publicidad</option>
            <option>Otro</option>
          </select>
          <div style={{ fontSize: "11px", color: "var(--muted2)", marginBottom: 5, marginTop: 10 }}>Estado</div>
          <select className="ed-sel">
            <option>Borrador</option>
            <option>En curso</option>
            <option>Finalizado</option>
          </select>
        </div>

        {/* Stats */}
        <div className="ed-r-sec">
          <div className="ed-r-ttl">Estadísticas</div>
          {[
            ["Palabras",  wordCount],
            ["Escenas",   sceneBlocks.length],
            ["Bloques",   blocks.length],
            ["~Páginas",  Math.ceil(wordCount / 250) || 0],
          ].map(([l, v]) => (
            <div className="ed-r-row" key={l}>
              <span className="ed-r-lbl">{l}</span>
              <span className="ed-r-val">{v}</span>
            </div>
          ))}
        </div>

        {/* Insert block */}
        <div className="ed-r-sec">
          <div className="ed-r-ttl">Insertar bloque</div>
          <div className="fmt-grid">
            {[
              ["🎬", "scene",      "Escena"],
              ["📝", "action",     "Acción"],
              ["👤", "char",       "Personaje"],
              ["💬", "dialog",     "Diálogo"],
              ["()", "paren",      "Paréntesis"],
              ["⏭",  "transition", "Transición"],
            ].map(([ic, tp, lb]) => (
              <button key={tp} className="fmt-btn" onClick={() => addBlock(tp)}>
                {ic} {lb}
              </button>
            ))}
          </div>
        </div>

        {/* Transitions reference */}
        <div className="ed-r-sec">
          <div className="ed-r-ttl">Tipos de transición</div>
          <div className="tr-ref-list">
            {TRANSITIONS.map(t => (
              <div key={t} className="tr-ref-item"
                onClick={() => addBlock("transition")}>
                {t}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}