import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback
} from "react";

import "../styles/Editor.css";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  HeadingLevel
} from "docx";

import { saveAs } from "file-saver";

/* ======================================================== */
/* CONSTANTS                                                */
/* ======================================================== */

const LABELS = {
  scene:     "escena",
  action:    "acción",
  char:      "personaje",
  dialog:    "diálogo",
  paren:     "nota",
  acotation: "acotación"
};

const SLASH_COMMANDS = {
  "/escena":    "scene",
  "/accion":    "action",
  "/personaje": "char",
  "/dialogo":   "dialog",
  "/dialog":    "dialog",
  "/nota":      "paren",
  "/acotacion": "acotation"
};

const BLOCK_ORDER = [
  "action",
  "char",
  "dialog",
  "paren",
  "scene",
  "acotation"
];

/* ======================================================== */
/* PAGINATION ENGINE                                        */
/* ======================================================== */

// A4 page in pixels at 96dpi: 794 × 1123
// We use a logical height unit instead.
// Each line of text is ~24px tall at our font size.
// Margins: top 96px + bottom 72px = 168px used by frame.
// Available content height per page: ~900px

const PAGE_CONTENT_HEIGHT = 900; // px of usable space per page

// Approximate rendered height of each block type
function estimateBlockHeight(block) {
  const CHAR_PER_LINE = 62;
  const LINE_HEIGHT   = 26;
  const BASE_PADDING  = 32; // block padding top+bottom
  const LABEL_HEIGHT  = 18;

  const text  = block.val || "";
  const chars = text.length || 1;
  const lines = Math.max(1, Math.ceil(chars / CHAR_PER_LINE));

  let lineH = LINE_HEIGHT;
  let extra = 0;

  switch (block.type) {
    case "scene":
      extra = 66; // margin-top 44 + extra 22
      lineH = 28;
      break;
    case "action":
      extra = 24;
      break;
    case "char":
      extra = 12;
      break;
    case "dialog":
      extra = 8;
      break;
    case "paren":
      extra = 8;
      break;
    case "acotation":
      extra = 34;
      break;
    default:
      extra = 0;
  }

  return BASE_PADDING + LABEL_HEIGHT + lines * lineH + extra;
}

function paginateBlocks(blocks) {
  const pages  = [];
  let current  = [];
  let usedHeight = 0;

  for (const block of blocks) {
    const h = estimateBlockHeight(block);

    // scene heading always starts a new page if page is more than 60% full
    if (
      block.type === "scene" &&
      usedHeight > PAGE_CONTENT_HEIGHT * 0.6 &&
      current.length > 0
    ) {
      pages.push(current);
      current    = [block];
      usedHeight = h;
      continue;
    }

    if (usedHeight + h > PAGE_CONTENT_HEIGHT && current.length > 0) {
      pages.push(current);
      current    = [block];
      usedHeight = h;
    } else {
      current.push(block);
      usedHeight += h;
    }
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

/* ======================================================== */
/* SCRIPT BLOCK COMPONENT                                   */
/* ======================================================== */

function ScriptBlock({
  block,
  active,
  onFocus,
  onChange,
  onKeyDown,
  blockRef,
  characterSuggestions,
  onSelectCharacter
}) {
  const taRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height =
      Math.min(taRef.current.scrollHeight, 800) + "px";
  }, [block.val]);

  // Focus when active
  useEffect(() => {
    if (active && taRef.current) {
      taRef.current.focus();
      const len = taRef.current.value.length;
      taRef.current.setSelectionRange(len, len);
    }
  }, [active]);

  return (
    <div
      className={`sblk sblk-${block.type}${active ? " is-active" : ""}`}
      ref={blockRef}
    >
      <div className="sblk-lbl">{LABELS[block.type]}</div>

      <textarea
        ref={taRef}
        rows={1}
        spellCheck={false}
        value={block.val}
        placeholder={`Escribe ${LABELS[block.type]}...`}
        className="script-textarea"
        onFocus={() => onFocus(block.id)}
        onChange={(e) => onChange(block.id, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, block)}
      />

      {block.type === "char" && characterSuggestions.length > 0 && (
        <div className="ed-autocomplete">
          {characterSuggestions.map((name) => (
            <div
              key={name}
              className="ed-autocomplete-item"
              onMouseDown={() => onSelectCharacter(block.id, name)}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======================================================== */
/* PAGE COMPONENT                                           */
/* ======================================================== */

function ScriptPage({
  pageNumber,
  totalPages,
  blocks,
  activeId,
  refs,
  characterNames,
  onFocus,
  onUpdate,
  onKeyDown,
  onAdd,
  onRemove
}) {
  return (
    <div className="script-page" data-page={pageNumber}>
      <div className="script-page-number">
        {pageNumber} / {totalPages}
      </div>

      <div className="script-page-inner">
        {blocks.map((block) => {
          const suggestions =
            block.type === "char"
              ? characterNames.filter(
                  (c) =>
                    c.startsWith(block.val.toUpperCase()) &&
                    c !== block.val.toUpperCase()
                )
              : [];

          return (
            <div key={block.id} className="sp-block-wrap">
              <ScriptBlock
                block={block}
                active={activeId === block.id}
                blockRef={(el) => (refs.current[block.id] = el)}
                onFocus={onFocus}
                onChange={onUpdate}
                onKeyDown={onKeyDown}
                characterSuggestions={suggestions}
                onSelectCharacter={(id, value) => onUpdate(id, value)}
              />

              <div className="sp-block-actions">
                <button
                  className="sp-bact"
                  title="Agregar bloque"
                  onClick={() => onAdd("action", block.id)}
                >
                  ＋
                </button>
                <button
                  className="sp-bact danger"
                  title="Eliminar bloque"
                  onClick={() => onRemove(block.id)}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ======================================================== */
/* CREDITS PAGE COMPONENT                                   */
/* ======================================================== */

function CreditsPage({ credits, setCredits }) {
  return (
    <div className="script-page credits-page">
      <div className="script-page-number">créditos</div>
      <div className="credits-page-inner">
        <div className="credits-badge">GUION CINEMATOGRÁFICO</div>

        <div className="credits-title-wrap">
          <input
            className="credits-title-inp"
            value={credits.title}
            onChange={(e) =>
              setCredits((c) => ({ ...c, title: e.target.value }))
            }
            placeholder="TÍTULO DEL GUION"
          />
        </div>

        <div className="credits-divider" />

        <div className="credits-fields">
          <div className="credits-field">
            <label className="credits-field-lbl">Escrito por</label>
            <input
              className="credits-field-inp"
              value={credits.writer}
              onChange={(e) =>
                setCredits((c) => ({ ...c, writer: e.target.value }))
              }
              placeholder="Nombre del autor"
            />
          </div>

          <div className="credits-field">
            <label className="credits-field-lbl">Versión</label>
            <input
              className="credits-field-inp"
              value={credits.version}
              onChange={(e) =>
                setCredits((c) => ({ ...c, version: e.target.value }))
              }
              placeholder="Borrador 1"
            />
          </div>

          <div className="credits-field">
            <label className="credits-field-lbl">Fecha</label>
            <input
              className="credits-field-inp"
              value={credits.date}
              onChange={(e) =>
                setCredits((c) => ({ ...c, date: e.target.value }))
              }
            />
          </div>

          <div className="credits-field">
            <label className="credits-field-lbl">Contacto</label>
            <input
              className="credits-field-inp"
              value={credits.contact}
              onChange={(e) =>
                setCredits((c) => ({ ...c, contact: e.target.value }))
              }
              placeholder="email@ejemplo.com"
            />
          </div>
        </div>

        <div className="credits-footer">
          <div className="credits-footer-line" />
          <div className="credits-footer-text">
            {credits.writer || "—"} · {credits.version} · {credits.date}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================== */
/* MAIN EDITOR                                              */
/* ======================================================== */

export default function Editor({
  initTitle    = "Sin título",
  initTemplate,
  onBack
}) {

  /* -------------------------------------------------- */
  /* STATE                                              */
  /* -------------------------------------------------- */

  const [blocks, setBlocks] = useState([
    { id: 1, type: "scene",  val: "INT. APARTAMENTO — NOCHE" },
    { id: 2, type: "action", val: "La lluvia golpea las ventanas." }
  ]);

  const [nextId,          setNextId]          = useState(3);
  const [activeId,        setActiveId]        = useState(1);
  const [showCredits,     setShowCredits]     = useState(true);
<<<<<<< HEAD
=======
  const [zenMode,         setZenMode]         = useState(false);
>>>>>>> 5853a2731b14d9b47e3508ba01523a3f589a31bc
  const [paperMode,       setPaperMode]       = useState(false);
  const [leftCollapsed,   setLeftCollapsed]   = useState(false);
  const [rightCollapsed,  setRightCollapsed]  = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [rightTab,        setRightTab]        = useState("stats");
  const [history,         setHistory]         = useState([]);
  const [future,          setFuture]          = useState([]);

  const [credits, setCredits] = useState({
    title:   initTitle,
    writer:  "",
    version: "Borrador 1",
    date:    new Date().toLocaleDateString(),
    contact: ""
  });

  const dragId      = useRef(null);
  const dragSceneId = useRef(null);
  const refs        = useRef({});

  /* -------------------------------------------------- */
  /* HISTORY                                            */
  /* -------------------------------------------------- */

  const snapshot = useCallback(() => {
    setHistory((prev) => [...prev.slice(-60), JSON.stringify(blocks)]);
    setFuture([]);
  }, [blocks]);

  const undo = useCallback(() => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture((f) => [JSON.stringify(blocks), ...f]);
    setBlocks(JSON.parse(previous));
    setHistory((h) => h.slice(0, -1));
  }, [history, blocks]);

  const redo = useCallback(() => {
    if (!future.length) return;
    const next = future[0];
    setHistory((h) => [...h, JSON.stringify(blocks)]);
    setBlocks(JSON.parse(next));
    setFuture((f) => f.slice(1));
  }, [future, blocks]);

  /* -------------------------------------------------- */
  /* DERIVED                                            */
  /* -------------------------------------------------- */

  const scenes = useMemo(
    () => blocks.filter((b) => b.type === "scene"),
    [blocks]
  );

  const wordCount = useMemo(
    () =>
      blocks.reduce(
        (acc, b) =>
          acc + b.val.trim().split(/\s+/).filter(Boolean).length,
        0
      ),
    [blocks]
  );

  const characterNames = useMemo(
    () => [
      ...new Set(
        blocks
          .filter((b) => b.type === "char")
          .map((b) => b.val.toUpperCase())
          .filter(Boolean)
      )
    ],
    [blocks]
  );

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeId),
    [blocks, activeId]
  );

  // Real paginated pages
  const pages = useMemo(() => paginateBlocks(blocks), [blocks]);

  /* -------------------------------------------------- */
  /* HELPERS                                            */
  /* -------------------------------------------------- */

  const focusBlock = useCallback((id) => {
    setTimeout(() => setActiveId(id), 10);
  }, []);

  const getNextType = useCallback((type) => {
    switch (type) {
      case "scene":     return "action";
      case "action":    return "action";
      case "char":      return "dialog";
      case "dialog":    return "char";
      case "paren":     return "dialog";
      case "acotation": return "scene";
      default:          return "action";
    }
  }, []);

  /* -------------------------------------------------- */
  /* CRUD                                               */
  /* -------------------------------------------------- */

  const updateBlock = useCallback((id, val) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, val } : b))
    );
  }, []);

  const addBlock = useCallback(
    (type, afterId = null) => {
      snapshot();

      const newBlock = {
        id:  nextId,
        type,
        val: type === "acotation" ? "CORTE A:" : ""
      };

      setNextId((n) => n + 1);

      setBlocks((prev) => {
        if (afterId == null) return [...prev, newBlock];

        const idx  = prev.findIndex((b) => b.id === afterId);
        const copy = [...prev];
        copy.splice(idx + 1, 0, newBlock);
        return copy;
      });

      focusBlock(newBlock.id);
    },
    [snapshot, nextId, focusBlock]
  );

  const removeBlock = useCallback(
    (id) => {
      if (blocks.length <= 1) return;
      snapshot();

      const idx       = blocks.findIndex((b) => b.id === id);
      const nextFocus = blocks[idx - 1] || blocks[idx + 1];

      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (nextFocus) focusBlock(nextFocus.id);
    },
    [blocks, snapshot, focusBlock]
  );

  /* -------------------------------------------------- */
  /* NAVIGATION                                         */
  /* -------------------------------------------------- */

  const navigateBlock = useCallback(
    (currentId, direction) => {
      const idx    = blocks.findIndex((b) => b.id === currentId);
      const target = blocks[idx + direction];
      if (target) focusBlock(target.id);
    },
    [blocks, focusBlock]
  );

  /* -------------------------------------------------- */
  /* KEYBOARD                                           */
  /* -------------------------------------------------- */

  const handleKeyDown = useCallback(
    (e, block) => {

      // slash commands
      if (e.key === " " && SLASH_COMMANDS[block.val.trim()]) {
        e.preventDefault();
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id
              ? { ...b, type: SLASH_COMMANDS[block.val.trim()], val: "" }
              : b
          )
        );
        return;
      }

      // enter
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addBlock(getNextType(block.type), block.id);
        return;
      }

      // tab — cycle type
      if (e.key === "Tab") {
        e.preventDefault();
        const nextType =
          BLOCK_ORDER[
            (BLOCK_ORDER.indexOf(block.type) + 1) % BLOCK_ORDER.length
          ];
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, type: nextType } : b
          )
        );
        return;
      }

      // backspace on empty
      if (e.key === "Backspace" && !block.val) {
        e.preventDefault();
        removeBlock(block.id);
        return;
      }

      // arrow nav
      if (e.key === "ArrowUp" && e.metaKey) {
        e.preventDefault();
        navigateBlock(block.id, -1);
        return;
      }

      if (e.key === "ArrowDown" && e.metaKey) {
        e.preventDefault();
        navigateBlock(block.id, 1);
        return;
      }

      // undo / redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
        return;
      }
    },
    [addBlock, getNextType, removeBlock, navigateBlock, redo, undo]
  );

  /* -------------------------------------------------- */
  /* SCENE DRAG & DROP (moves entire scene group)       */
  /* -------------------------------------------------- */

  // Get all blocks belonging to a scene (from scene header to next scene - 1)
  const getSceneGroup = useCallback(
    (sceneId) => {
      const startIdx = blocks.findIndex((b) => b.id === sceneId);
      if (startIdx === -1) return [];

      const group = [blocks[startIdx]];

      for (let i = startIdx + 1; i < blocks.length; i++) {
        if (blocks[i].type === "scene") break;
        group.push(blocks[i]);
      }

      return group;
    },
    [blocks]
  );

  const reorderScenes = useCallback(
    (fromSceneId, toSceneId) => {
      if (fromSceneId === toSceneId) return;

      snapshot();

      const fromGroup = getSceneGroup(fromSceneId);
      const fromIds   = new Set(fromGroup.map((b) => b.id));

      // blocks without the "from" group
      const withoutFrom = blocks.filter((b) => !fromIds.has(b.id));

      // find insertion point: index of toSceneId in withoutFrom
      const insertIdx = withoutFrom.findIndex((b) => b.id === toSceneId);

      if (insertIdx === -1) {
        setBlocks([...withoutFrom, ...fromGroup]);
        return;
      }

      const result = [...withoutFrom];
      result.splice(insertIdx, 0, ...fromGroup);
      setBlocks(result);
    },
    [blocks, snapshot, getSceneGroup]
  );

  /* -------------------------------------------------- */
  /* EXPORTS                                            */
  /* -------------------------------------------------- */

  const exportTXT = useCallback(() => {
    let content = `${credits.title}\n`;
    if (credits.writer) content += `Escrito por: ${credits.writer}\n`;
    content += `${credits.version} — ${credits.date}\n\n`;
    content += "=".repeat(60) + "\n\n";

    blocks.forEach((b) => {
      switch (b.type) {
        case "scene":
          content += `\n${b.val.toUpperCase()}\n\n`;
          break;
        case "char":
          content += `\n                    ${b.val.toUpperCase()}\n`;
          break;
        case "dialog":
          content += `          ${b.val}\n`;
          break;
        case "paren":
          content += `               (${b.val})\n`;
          break;
        case "action":
          content += `${b.val}\n\n`;
          break;
        case "acotation":
          content += `\n                                        ${b.val.toUpperCase()}\n\n`;
          break;
        default:
          content += `${b.val}\n\n`;
      }
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${credits.title}.txt`);
  }, [blocks, credits]);

  const exportDOCX = useCallback(async () => {
    // Twips conversion: 1 inch = 1440 twips
    // Standard screenplay margins:
    //   Left: 1.5" = 2160, Right: 1" = 1440, Top/Bottom: 1" = 1440
    // Character: 3.7" from left = 5328
    // Dialog: starts at 2.5" from left = 3600, width ~3.5" = 5040
    // Paren: starts at 3" from left = 4320, width ~2.5" = 3600

    const creditsChildren = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing:   { before: 2880, after: 480 },
        children:  [
          new TextRun({
            text:  credits.title.toUpperCase(),
            bold:  true,
            size:  52,
            font:  "Courier Prime"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing:   { before: 480, after: 240 },
        children:  [
          new TextRun({
            text: "Escrito por",
            size: 24,
            font: "Courier Prime"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing:   { before: 240, after: 2880 },
        children:  [
          new TextRun({
            text: credits.writer || "—",
            bold: true,
            size: 28,
            font: "Courier Prime"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing:   { before: 0, after: 240 },
        children:  [
          new TextRun({
            text: `${credits.version} — ${credits.date}`,
            size: 20,
            font: "Courier Prime"
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children:  [
          new TextRun({
            text: credits.contact || "",
            size: 20,
            font: "Courier Prime"
          })
        ]
      })
    ];

    const scriptChildren = blocks.map((b, i) => {
      const isFirst = i === 0;

      switch (b.type) {

        case "scene":
          return new Paragraph({
            pageBreakBefore: !isFirst,
            spacing: { before: 480, after: 240 },
            children: [
              new TextRun({
                text:  b.val.toUpperCase(),
                bold:  true,
                size:  24,
                font:  "Courier Prime"
              })
            ]
          });

        case "action":
          return new Paragraph({
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({
                text: b.val,
                size: 24,
                font: "Courier Prime"
              })
            ]
          });

        case "char":
          return new Paragraph({
            alignment: AlignmentType.LEFT,
            indent:    { left: 3600 },
            spacing:   { before: 240, after: 0 },
            children:  [
              new TextRun({
                text:  b.val.toUpperCase(),
                bold:  true,
                size:  24,
                font:  "Courier Prime"
              })
            ]
          });

        case "dialog":
          return new Paragraph({
            indent:  { left: 1800, right: 1440 },
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: b.val,
                size: 24,
                font: "Courier Prime"
              })
            ]
          });

        case "paren":
          return new Paragraph({
            indent:  { left: 2520, right: 2160 },
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text:   `(${b.val})`,
                italics: true,
                size:   24,
                font:   "Courier Prime"
              })
            ]
          });

        case "acotation":
          return new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing:   { before: 480, after: 480 },
            children:  [
              new TextRun({
                text:  b.val.toUpperCase(),
                bold:  true,
                size:  24,
                font:  "Courier Prime"
              })
            ]
          });

        default:
          return new Paragraph({
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({ text: b.val, size: 24, font: "Courier Prime" })
            ]
          });
      }
    });

    const doc = new Document({
      sections: [
        // ---- Section 1: Credits page ----
        {
          properties: {
            page: {
              margin: {
                top:    1440,
                bottom: 1440,
                left:   2160,
                right:  1440
              }
            }
          },
          children: creditsChildren
        },
        // ---- Section 2: Script ----
        {
          properties: {
            page: {
              margin: {
                top:    1440,
                bottom: 1440,
                left:   2160,
                right:  1440
              }
            }
          },
          children: scriptChildren
        }
      ]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${credits.title}.docx`);
  }, [blocks, credits]);

  /* -------------------------------------------------- */
  /* GLOBAL SHORTCUTS                                   */
  /* -------------------------------------------------- */

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "1") addBlock("scene");
      if ((e.ctrlKey || e.metaKey) && e.key === "2") addBlock("action");
      if ((e.ctrlKey || e.metaKey) && e.key === "3") addBlock("char");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addBlock]);

  /* -------------------------------------------------- */
  /* SCENE PAGE MAPPING                                 */
  /* -------------------------------------------------- */

  // For each scene id → which real page number (1-indexed, after credits)
  const scenePageMap = useMemo(() => {
    const map = {};
    pages.forEach((pageBlocks, idx) => {
      pageBlocks.forEach((b) => {
        if (b.type === "scene" && !(b.id in map)) {
          map[b.id] = idx + 2; // +2 because credits = page 1
        }
      });
    });
    return map;
  }, [pages]);

  /* -------------------------------------------------- */
  /* RENDER                                             */
  /* -------------------------------------------------- */

  const shellClasses = [
    "editor-shell",
<<<<<<< HEAD
=======
    zenMode        ? "zen-mode"        : "",
>>>>>>> 5853a2731b14d9b47e3508ba01523a3f589a31bc
    paperMode      ? "paper-mode"      : "",
    leftCollapsed  ? "left-collapsed"  : "",
    rightCollapsed ? "right-collapsed" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClasses}>

      {/* ===================== LEFT ===================== */}
      <aside className={`ed-left${leftCollapsed ? " collapsed" : ""}`}>

        <div className="ed-panel-header">
          {!leftCollapsed && (
            <div className="ed-panel-title">Escenas</div>
          )}
          <button
            className="ed-icon-btn"
            onClick={() => setLeftCollapsed((v) => !v)}
          >
            ☰
          </button>
        </div>

        {!leftCollapsed && (
          <div className="ed-sc-list">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                draggable
                onDragStart={() => { dragSceneId.current = scene.id; }}
                onDragOver={(e)  => e.preventDefault()}
                onDrop={() => {
                  if (dragSceneId.current !== null) {
                    reorderScenes(dragSceneId.current, scene.id);
                    dragSceneId.current = null;
                  }
                }}
                onClick={() => focusBlock(scene.id)}
                className={`ed-sc-item${activeId === scene.id ? " on" : ""}`}
              >
                <div className="ed-sc-top">
                  <div className="ed-sc-n">ESC {index + 1}</div>
                  <div className="ed-sc-page">
                    p.{scenePageMap[scene.id] ?? "—"}
                  </div>
                </div>
                <div className="ed-sc-t">{scene.val}</div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ===================== CENTER ===================== */}
      <main className="ed-center">

        {/* TOOLBAR */}
        <div className="ed-toolbar">
          <div className="ed-toolbar-group">
            <button className="ed-tb-btn" onClick={() => addBlock("scene")}>
              🎬 Escena
            </button>
            <button className="ed-tb-btn" onClick={() => addBlock("action")}>
              📝 Acción
            </button>
            <button className="ed-tb-btn" onClick={() => addBlock("char")}>
              👤 Personaje
            </button>
            <button className="ed-tb-btn" onClick={() => addBlock("dialog")}>
              💬 Diálogo
            </button>
          </div>

          <div className="ed-toolbar-group">
            <button
<<<<<<< HEAD
=======
              className={`ed-tb-btn${zenMode ? " active" : ""}`}
              onClick={() => setZenMode((v) => !v)}
            >
              🧘 Zen
            </button>
            <button
>>>>>>> 5853a2731b14d9b47e3508ba01523a3f589a31bc
              className={`ed-tb-btn${paperMode ? " active" : ""}`}
              onClick={() => setPaperMode((v) => !v)}
            >
              📄 Papel
            </button>
            <button
              className={`ed-tb-btn${showCredits ? " active" : ""}`}
              onClick={() => setShowCredits((v) => !v)}
            >
              🎞 Créditos
            </button>
            <button
              className="ed-tb-btn"
              onClick={() => setRightCollapsed((v) => !v)}
            >
              📚 Inspector
            </button>
          </div>

          <div className="ed-toolbar-spacer" />

          <button className="ed-tb-btn" onClick={undo}>↶ Undo</button>
          <button className="ed-tb-btn" onClick={redo}>↷ Redo</button>
          <button className="ed-tb-btn" onClick={exportTXT}>TXT</button>
          <button className="ed-tb-btn" onClick={exportDOCX}>DOCX</button>
          <button className="ed-tb-btn ed-tb-save">
            {saved ? "✓ Guardado" : "💾 Guardar"}
          </button>
        </div>

        {/* BREADCRUMB */}
        <div className="ed-crumb">
          <button onClick={onBack}>← Volver</button>
          <span>/</span>
          <span>{credits.title}</span>
          {initTemplate && (
            <>
              <span>·</span>
              <span>{initTemplate}</span>
            </>
          )}
        </div>

        {/* BODY — paginated */}
        <div className="ed-body">
          <div className="ed-pages-container">

            {/* CREDITS PAGE */}
            {showCredits && (
              <CreditsPage credits={credits} setCredits={setCredits} />
            )}

            {/* SCRIPT PAGES */}
            {pages.map((pageBlocks, idx) => (
              <ScriptPage
                key={idx}
                pageNumber={idx + (showCredits ? 2 : 1)}
                totalPages={pages.length + (showCredits ? 1 : 0)}
                blocks={pageBlocks}
                activeId={activeId}
                refs={refs}
                characterNames={characterNames}
                onFocus={setActiveId}
                onUpdate={updateBlock}
                onKeyDown={handleKeyDown}
                onAdd={addBlock}
                onRemove={removeBlock}
              />
            ))}

            {/* QUICK ADD */}
            <div className="sp-quick-add">
              {[
                ["scene",     "🎬 Escena"],
                ["action",    "📝 Acción"],
                ["char",      "👤 Personaje"],
                ["dialog",    "💬 Diálogo"],
                ["paren",     "() Nota"],
                ["acotation", "⏭ Acotación"]
              ].map(([type, label]) => (
                <button
                  key={type}
                  className="sp-qa-btn"
                  onClick={() => addBlock(type)}
                >
                  {label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* STATUS */}
        <div className="ed-status">
          <div className="ed-status-dot" />
          <span>{wordCount} palabras</span>
          <span>·</span>
          <span>{blocks.length} bloques</span>
          <span>·</span>
          <span>{scenes.length} escenas</span>
          <span>·</span>
          <span>{pages.length + (showCredits ? 1 : 0)} páginas</span>
        </div>
      </main>

      {/* ===================== RIGHT ===================== */}
      <aside className={`ed-right${rightCollapsed ? " collapsed" : ""}`}>

        <div className="ed-right-tabs">
          {[
            ["inspector",  "Inspector"],
            ["characters", "Personajes"],
            ["notes",      "Atajos"],
            ["stats",      "Stats"]
          ].map(([id, label]) => (
            <button
              key={id}
              className={`ed-right-tab${rightTab === id ? " active" : ""}`}
              onClick={() => setRightTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ed-right-content">

          {/* STATS */}
          {rightTab === "stats" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">Estadísticas</div>

              <div className="ed-r-row">
                <span className="ed-r-lbl">Palabras</span>
                <span className="ed-r-val">{wordCount}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Escenas</span>
                <span className="ed-r-val">{scenes.length}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Bloques</span>
                <span className="ed-r-val">{blocks.length}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Páginas reales</span>
                <span className="ed-r-val">
                  {pages.length + (showCredits ? 1 : 0)}
                </span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Personajes únicos</span>
                <span className="ed-r-val">{characterNames.length}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Min. estimados</span>
                <span className="ed-r-val">
                  ~{Math.ceil(wordCount / 220)}
                </span>
              </div>
            </div>
          )}

          {/* CHARACTERS */}
          {rightTab === "characters" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">Personajes</div>
              {characterNames.length === 0 && (
                <div className="ed-r-empty">
                  Ningún personaje aún
                </div>
              )}
              {characterNames.map((name) => (
                <div className="ed-r-row" key={name}>
                  <span className="ed-r-lbl">{name}</span>
                  <span className="ed-r-val ed-r-char-count">
                    {blocks.filter(
                      (b) => b.type === "char" && b.val.toUpperCase() === name
                    ).length}
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* INSPECTOR */}
          {rightTab === "inspector" && (
            <>
              <div className="ed-r-sec">
                <div className="ed-r-ttl">Proyecto</div>
                <label className="ed-r-field-lbl">Título</label>
                <input
                  className="ed-inp"
                  value={credits.title}
                  onChange={(e) =>
                    setCredits((c) => ({ ...c, title: e.target.value }))
                  }
                />
              </div>

              <div className="ed-r-sec">
                <div className="ed-r-ttl">Bloque activo</div>
                <div className="ed-r-row">
                  <span className="ed-r-lbl">Tipo</span>
                  <span className="ed-r-val">
                    {activeBlock ? LABELS[activeBlock.type] : "—"}
                  </span>
                </div>
                <div className="ed-r-row">
                  <span className="ed-r-lbl">ID</span>
                  <span className="ed-r-val">
                    #{activeBlock?.id ?? "—"}
                  </span>
                </div>
              </div>

              <div className="ed-r-sec">
                <div className="ed-r-ttl">Insertar bloque</div>
                <div className="fmt-grid">
                  {[
                    ["scene",     "🎬 Escena"],
                    ["action",    "📝 Acción"],
                    ["char",      "👤 Personaje"],
                    ["dialog",    "💬 Diálogo"],
                    ["paren",     "() Nota"],
                    ["acotation", "⏭ Acotación"]
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      className="fmt-btn"
                      onClick={() => addBlock(type, activeId)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* NOTES / SHORTCUTS */}
          {rightTab === "notes" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">Atajos de teclado</div>

              {[
                ["Enter",            "Nuevo bloque"],
                ["Tab",              "Cambiar tipo"],
                ["Backspace vacío",  "Eliminar bloque"],
                ["Cmd/Ctrl + Z",     "Undo"],
                ["Cmd/Ctrl + Shift+Z","Redo"],
                ["Cmd/Ctrl + S",     "Guardar"],
                ["Cmd/Ctrl + ↑/↓",  "Navegar bloques"],
                ["/escena",          "→ Escena"],
                ["/accion",          "→ Acción"],
                ["/personaje",       "→ Personaje"],
                ["/dialogo",         "→ Diálogo"],
                ["/nota",            "→ Nota"],
                ["/acotacion",       "→ Acotación"]
              ].map(([key, desc]) => (
                <div className="ed-r-row" key={key}>
                  <span className="ed-r-lbl ed-r-key">{key}</span>
                  <span className="ed-r-val">{desc}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </aside>

    </div>
  );
}