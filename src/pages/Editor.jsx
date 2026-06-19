import { useState, useRef, useEffect, useMemo, useCallback } from "react";

import "../styles/Editor.css";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  HeadingLevel,
} from "docx";

import { jsPDF } from "jspdf";

import { saveAs } from "file-saver";
import API_BASE from "../utils/api";

/* ======================================================== */
/* CONSTANTS                                                */
/* ======================================================== */

const LABELS = {
  scene: "escena",
  action: "acción",
  char: "personaje",
  dialog: "diálogo",
  paren: "nota",
  acotation: "acotación",
};

const SLASH_COMMANDS = {
  "/escena": "scene",
  "/accion": "action",
  "/personaje": "char",
  "/dialogo": "dialog",
  "/dialog": "dialog",
  "/nota": "paren",
  "/acotacion": "acotation",
};

const BLOCK_ORDER = ["action", "char", "dialog", "paren", "scene", "acotation"];

const createEmptyAIInsights = () => ({
  summary: {
    logline: "",
    shortSynopsis: "",
    sceneSummary: [],
  },
  feedback: {
    overall: "",
    strengths: [],
    improvements: [],
    nextSteps: [],
  },
  generatedAt: "",
  model: "",
});

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
  const LINE_HEIGHT = 26;
  const BASE_PADDING = 32; // block padding top+bottom
  const LABEL_HEIGHT = 18;

  const text = block.val || "";
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
  const pages = [];
  let current = [];
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
      current = [block];
      usedHeight = h;
      continue;
    }

    if (usedHeight + h > PAGE_CONTENT_HEIGHT && current.length > 0) {
      pages.push(current);
      current = [block];
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
  onSelectCharacter,
  commentCount = 0,
  onComment,
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
      className={`sblk sblk-${block.type}${active ? " is-active" : ""}${commentCount > 0 ? " has-comments" : ""}`}
      ref={blockRef}
    >
      <div className="sblk-lbl">{LABELS[block.type]}</div>
      {commentCount > 0 && (
        <button
          className="sblk-comment-badge"
          onClick={(e) => {
            e.stopPropagation();
            onComment(block.id);
          }}
          title={`${commentCount} comentario${commentCount !== 1 ? "s" : ""}`}
        >
          💬 {commentCount}
        </button>
      )}

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
  onRemove,
  inlineComments = [],
  commentingBlockId = null,
  onToggleComment,
  commentDraft = "",
  onCommentDraftChange,
  onSubmitComment,
  onResolveComment,
  onDeleteComment,
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
                    c !== block.val.toUpperCase(),
                )
              : [];

          const blockComments = inlineComments.filter(
            (c) => c.blockId === block.id,
          );
          const isCommenting = commentingBlockId === block.id;

          return (
            <div key={block.id} className="sp-block-outer">
              <div className="sp-block-wrap">
                <ScriptBlock
                  block={block}
                  active={activeId === block.id}
                  blockRef={(el) => (refs.current[block.id] = el)}
                  onFocus={onFocus}
                  onChange={onUpdate}
                  onKeyDown={onKeyDown}
                  characterSuggestions={suggestions}
                  onSelectCharacter={(id, value) => onUpdate(id, value)}
                  commentCount={blockComments.length}
                  onComment={onToggleComment}
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
                  <button
                    className={`sp-bact comment${blockComments.length > 0 ? " comment-on" : ""}`}
                    title="Comentar este bloque"
                    onClick={() => onToggleComment(block.id)}
                  >
                    💬
                  </button>
                </div>
              </div>

              {/* Inline comment form */}
              {isCommenting && (
                <div className="sp-comment-form">
                  <div className="sp-cf-header">
                    <span>
                      Comentario en <strong>{LABELS[block.type]}</strong>
                    </span>
                    <button
                      className="sp-cf-close"
                      onClick={() => onToggleComment(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    className="sp-cf-input"
                    placeholder="Escribe un comentario…"
                    value={commentDraft}
                    onChange={(e) => onCommentDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey)
                        onSubmitComment(block.id);
                      if (e.key === "Escape") onToggleComment(null);
                    }}
                    autoFocus
                    rows={2}
                  />
                  <div className="sp-cf-footer">
                    <span className="sp-cf-hint">Ctrl+Enter para enviar</span>
                    <button
                      className="sp-cf-submit"
                      onClick={() => onSubmitComment(block.id)}
                      disabled={!commentDraft.trim()}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              )}

              {/* Comment threads visible in the editor */}
              {blockComments.length > 0 && (
                <div className="sp-comment-thread">
                  {blockComments.map((c) => (
                    <div
                      key={c.id}
                      className={`sp-cmt-chip${c.resolved ? " resolved" : ""}`}
                    >
                      <div className="sp-cmt-chip-head">
                        <span className="sp-cmt-av">{c.initials}</span>
                        <span className="sp-cmt-author">{c.author}</span>
                        <span className="sp-cmt-time">{c.time}</span>
                        {c.resolved && (
                          <span className="sp-cmt-resolved-badge">
                            ✓ Resuelto
                          </span>
                        )}
                      </div>
                      <div className="sp-cmt-text">{c.text}</div>
                      <div className="sp-cmt-actions">
                        <button
                          className="sp-cmt-act"
                          onClick={() => onResolveComment(c.id)}
                        >
                          {c.resolved ? "↩ Reabrir" : "✓ Resolver"}
                        </button>
                        <button
                          className="sp-cmt-act danger"
                          onClick={() => onDeleteComment(c.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
  initTitle = "Sin título",
  initTemplate,
  initProject = null,
  onBack,
  onSaveProject,
  currentUser = null,
}) {
  /* -------------------------------------------------- */
  /* STATE                                              */
  /* -------------------------------------------------- */

  const [project, setProject] = useState(initProject);

  const [blocks, setBlocks] = useState(() => {
    if (initProject?.script?.blocks?.length > 0) {
      return initProject.script.blocks;
    }
    return [
      { id: 1, type: "scene", val: "INT. APARTAMENTO — NOCHE" },
      { id: 2, type: "action", val: "La lluvia golpea las ventanas." },
    ];
  });

  const [nextId, setNextId] = useState(3);
  const [activeId, setActiveId] = useState(1);
  const [showCredits, setShowCredits] = useState(true);
  const [paperMode, setPaperMode] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [rightTab, setRightTab] = useState("stats");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const [credits, setCredits] = useState(() => ({
    title: initProject?.script?.credits?.title || initTitle,
    writer: initProject?.script?.credits?.writer || "",
    version: initProject?.script?.credits?.version || "Borrador 1",
    date: initProject?.script?.credits?.date || new Date().toLocaleDateString(),
    contact: initProject?.script?.credits?.contact || "",
  }));

  const [inlineComments, setInlineComments] = useState(
    () => initProject?.script?.inlineComments || [],
  );
  const [aiInsights, setAiInsights] = useState(
    () => initProject?.script?.aiInsights || createEmptyAIInsights(),
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [commentingBlockId, setCommentingBlockId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");

  const dragId = useRef(null);
  const dragSceneId = useRef(null);
  const refs = useRef({});

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
    [blocks],
  );

  const wordCount = useMemo(
    () =>
      blocks.reduce(
        (acc, b) => acc + b.val.trim().split(/\s+/).filter(Boolean).length,
        0,
      ),
    [blocks],
  );

  const characterNames = useMemo(
    () => [
      ...new Set(
        blocks
          .filter((b) => b.type === "char")
          .map((b) => b.val.toUpperCase())
          .filter(Boolean),
      ),
    ],
    [blocks],
  );

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeId),
    [blocks, activeId],
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
      case "scene":
        return "action";
      case "action":
        return "action";
      case "char":
        return "dialog";
      case "dialog":
        return "char";
      case "paren":
        return "dialog";
      case "acotation":
        return "scene";
      default:
        return "action";
    }
  }, []);

  /* -------------------------------------------------- */
  /* CRUD                                               */
  /* -------------------------------------------------- */

  const updateBlock = useCallback((id, val) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, val } : b)));
  }, []);

  const addBlock = useCallback(
    (type, afterId = null) => {
      snapshot();

      const newBlock = {
        id: nextId,
        type,
        val: type === "acotation" ? "CORTE A:" : "",
      };

      setNextId((n) => n + 1);

      setBlocks((prev) => {
        if (afterId == null) return [...prev, newBlock];

        const idx = prev.findIndex((b) => b.id === afterId);
        const copy = [...prev];
        copy.splice(idx + 1, 0, newBlock);
        return copy;
      });

      focusBlock(newBlock.id);
    },
    [snapshot, nextId, focusBlock],
  );

  const removeBlock = useCallback(
    (id) => {
      if (blocks.length <= 1) return;
      snapshot();

      const idx = blocks.findIndex((b) => b.id === id);
      const nextFocus = blocks[idx - 1] || blocks[idx + 1];

      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (nextFocus) focusBlock(nextFocus.id);
    },
    [blocks, snapshot, focusBlock],
  );

  /* -------------------------------------------------- */
  /* NAVIGATION                                         */
  /* -------------------------------------------------- */

  const navigateBlock = useCallback(
    (currentId, direction) => {
      const idx = blocks.findIndex((b) => b.id === currentId);
      const target = blocks[idx + direction];
      if (target) focusBlock(target.id);
    },
    [blocks, focusBlock],
  );

  /* -------------------------------------------------- */
  /* KEYBOARD                                           */
  /* -------------------------------------------------- */

  const addInlineComment = useCallback(
    (blockId) => {
      if (!commentDraft.trim()) return;
      const block = blocks.find((b) => b.id === blockId);
      const comment = {
        id: Date.now(),
        blockId,
        blockType: block?.type || "action",
        text: commentDraft.trim(),
        author: currentUser?.name || "Guionista",
        initials: currentUser?.name
          ? currentUser.name.slice(0, 2).toUpperCase()
          : "GS",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        resolved: false,
      };
      setInlineComments((prev) => [...prev, comment]);
      setCommentingBlockId(null);
      setCommentDraft("");
    },
    [blocks, commentDraft, currentUser],
  );

  const toggleInlineComment = useCallback((blockId) => {
    setCommentingBlockId((prev) => (prev === blockId ? null : blockId));
    setCommentDraft("");
  }, []);

  const resolveInlineComment = useCallback((commentId) => {
    setInlineComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c,
      ),
    );
  }, []);

  const deleteInlineComment = useCallback((commentId) => {
    setInlineComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (project?.canEdit === false) {
      setSaveError("Este proyecto está en modo solo lectura.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    try {
      let savedProject = null;

      if (typeof onSaveProject === "function") {
        savedProject = await onSaveProject({
          id: project?.id,
          name: credits.title || "Sin título",
          template: initTemplate,
          blocks,
          credits,
          inlineComments,
          aiInsights,
        });
      }

      if (!savedProject) {
        throw new Error("No se pudo guardar el proyecto.");
      }

      setProject(savedProject);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (error) {
      setSaveError(error.message || "No se pudo guardar el proyecto.");
      setSaved(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    project,
    onSaveProject,
    credits,
    blocks,
    initTemplate,
    inlineComments,
    aiInsights,
  ]);

  const generateAIInsights = useCallback(async () => {
    setAiLoading(true);
    setAiError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "No existe token de autenticación. Inicia sesión de nuevo.",
        );
      }

      const response = await fetch(`${API_BASE}/api/ai/script-insights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: credits.title || "Sin título",
          script: {
            blocks,
            credits,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "No se pudo generar el análisis de IA");
      }

      setAiInsights(data.insights || createEmptyAIInsights());
      setRightTab("ai");
    } catch (error) {
      setAiError(error.message || "No se pudo generar el análisis del guion.");
    } finally {
      setAiLoading(false);
    }
  }, [blocks, credits]);

  const handleKeyDown = useCallback(
    (e, block) => {
      // slash commands
      if (e.key === " " && SLASH_COMMANDS[block.val.trim()]) {
        e.preventDefault();
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id
              ? { ...b, type: SLASH_COMMANDS[block.val.trim()], val: "" }
              : b,
          ),
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
          prev.map((b) => (b.id === block.id ? { ...b, type: nextType } : b)),
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
        handleSave();
        return;
      }
    },
    [addBlock, getNextType, removeBlock, navigateBlock, redo, undo, handleSave],
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
    [blocks],
  );

  const reorderScenes = useCallback(
    (fromSceneId, toSceneId) => {
      if (fromSceneId === toSceneId) return;

      snapshot();

      const fromGroup = getSceneGroup(fromSceneId);
      const fromIds = new Set(fromGroup.map((b) => b.id));

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
    [blocks, snapshot, getSceneGroup],
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
        spacing: { before: 2880, after: 480 },
        children: [
          new TextRun({
            text: credits.title.toUpperCase(),
            bold: true,
            size: 52,
            font: "Courier Prime",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 240 },
        children: [
          new TextRun({
            text: "Escrito por",
            size: 24,
            font: "Courier Prime",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 2880 },
        children: [
          new TextRun({
            text: credits.writer || "—",
            bold: true,
            size: 28,
            font: "Courier Prime",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [
          new TextRun({
            text: `${credits.version} — ${credits.date}`,
            size: 20,
            font: "Courier Prime",
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: credits.contact || "",
            size: 20,
            font: "Courier Prime",
          }),
        ],
      }),
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
                text: b.val.toUpperCase(),
                bold: true,
                size: 24,
                font: "Courier Prime",
              }),
            ],
          });

        case "action":
          return new Paragraph({
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({
                text: b.val,
                size: 24,
                font: "Courier Prime",
              }),
            ],
          });

        case "char":
          return new Paragraph({
            alignment: AlignmentType.LEFT,
            indent: { left: 3600 },
            spacing: { before: 240, after: 0 },
            children: [
              new TextRun({
                text: b.val.toUpperCase(),
                bold: true,
                size: 24,
                font: "Courier Prime",
              }),
            ],
          });

        case "dialog":
          return new Paragraph({
            indent: { left: 1800, right: 1440 },
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: b.val,
                size: 24,
                font: "Courier Prime",
              }),
            ],
          });

        case "paren":
          return new Paragraph({
            indent: { left: 2520, right: 2160 },
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text: `(${b.val})`,
                italics: true,
                size: 24,
                font: "Courier Prime",
              }),
            ],
          });

        case "acotation":
          return new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 480, after: 480 },
            children: [
              new TextRun({
                text: b.val.toUpperCase(),
                bold: true,
                size: 24,
                font: "Courier Prime",
              }),
            ],
          });

        default:
          return new Paragraph({
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({ text: b.val, size: 24, font: "Courier Prime" }),
            ],
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
                top: 1440,
                bottom: 1440,
                left: 2160,
                right: 1440,
              },
            },
          },
          children: creditsChildren,
        },
        // ---- Section 2: Script ----
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 2160,
                right: 1440,
              },
            },
          },
          children: scriptChildren,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${credits.title}.docx`);
  }, [blocks, credits]);

  const exportAISummaryDOCX = useCallback(async () => {
    if (!aiInsights?.summary?.logline && !aiInsights?.summary?.shortSynopsis) {
      return;
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              spacing: { after: 240 },
              children: [
                new TextRun({
                  text: `Resumen IA - ${credits.title || "Sin título"}`,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: `Generado: ${aiInsights.generatedAt || new Date().toLocaleString()}`,
                }),
              ],
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "Logline", bold: true })],
            }),
            new Paragraph({
              text: aiInsights.summary.logline || "Sin logline.",
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "Sinopsis breve", bold: true })],
            }),
            new Paragraph({
              text: aiInsights.summary.shortSynopsis || "Sin sinopsis.",
            }),
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [
                new TextRun({ text: "Resumen por escenas", bold: true }),
              ],
            }),
            ...(aiInsights.summary.sceneSummary || []).map(
              (item, index) =>
                new Paragraph({
                  text: `${index + 1}. ${item}`,
                  spacing: { after: 120 },
                }),
            ),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${credits.title || "guion"}-resumen-ia.docx`);
  }, [aiInsights, credits.title]);

  const exportAISummaryPDF = useCallback(() => {
    if (!aiInsights?.summary?.logline && !aiInsights?.summary?.shortSynopsis) {
      return;
    }

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    const maxWidth = 500;
    let cursorY = 54;

    const writeBlock = (title, text) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(title, marginX, cursorY);
      cursorY += 20;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(text || "-", maxWidth);
      pdf.text(lines, marginX, cursorY);
      cursorY += lines.length * 15 + 18;
      if (cursorY > 760) {
        pdf.addPage();
        cursorY = 54;
      }
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(`Resumen IA - ${credits.title || "Sin título"}`, marginX, cursorY);
    cursorY += 28;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      `Generado: ${aiInsights.generatedAt || new Date().toLocaleString()}`,
      marginX,
      cursorY,
    );
    cursorY += 28;

    writeBlock("Logline", aiInsights.summary.logline);
    writeBlock("Sinopsis breve", aiInsights.summary.shortSynopsis);
    writeBlock(
      "Resumen por escenas",
      (aiInsights.summary.sceneSummary || [])
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n\n"),
    );

    pdf.save(`${credits.title || "guion"}-resumen-ia.pdf`);
  }, [aiInsights, credits.title]);

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
    paperMode ? "paper-mode" : "",
    leftCollapsed ? "left-collapsed" : "",
    rightCollapsed ? "right-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClasses}>
      {/* ===================== LEFT ===================== */}
      <aside className={`ed-left${leftCollapsed ? " collapsed" : ""}`}>
        <div className="ed-panel-header">
          {!leftCollapsed && <div className="ed-panel-title">Escenas</div>}
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
                onDragStart={() => {
                  dragSceneId.current = scene.id;
                }}
                onDragOver={(e) => e.preventDefault()}
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
          </div>

          <div className="ed-toolbar-spacer" />

          <button className="ed-tb-btn" onClick={undo}>
            ↶ Undo
          </button>
          <button className="ed-tb-btn" onClick={redo}>
            ↷ Redo
          </button>
          <button className="ed-tb-btn" onClick={exportTXT}>
            TXT
          </button>
          <button className="ed-tb-btn" onClick={exportDOCX}>
            DOCX
          </button>
          <button className="ed-tb-btn" onClick={generateAIInsights}>
            {aiLoading ? "... IA" : "✨ IA"}
          </button>
          <button
            className="ed-tb-btn ed-tb-save"
            onClick={handleSave}
            disabled={isSaving || project?.canEdit === false}
            title={
              project?.canEdit === false
                ? "Proyecto en modo solo lectura"
                : "Guardar proyecto"
            }
          >
            {isSaving ? "Guardando..." : saved ? "✓ Guardado" : "💾 Guardar"}
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
                inlineComments={inlineComments}
                commentingBlockId={commentingBlockId}
                onToggleComment={toggleInlineComment}
                commentDraft={commentDraft}
                onCommentDraftChange={setCommentDraft}
                onSubmitComment={addInlineComment}
                onResolveComment={resolveInlineComment}
                onDeleteComment={deleteInlineComment}
              />
            ))}

            {/* QUICK ADD */}
            <div className="sp-quick-add">
              {[
                ["scene", "🎬 Escena"],
                ["action", "📝 Acción"],
                ["char", "👤 Personaje"],
                ["dialog", "💬 Diálogo"],
                ["paren", "() Nota"],
                ["acotation", "⏭ Acotación"],
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
          {saveError && (
            <>
              <span>·</span>
              <span style={{ color: "#e25b5b" }}>{saveError}</span>
            </>
          )}
        </div>
      </main>

      {/* ===================== RIGHT ===================== */}
      <aside className={`ed-right${rightCollapsed ? " collapsed" : ""}`}>
        <div className="ed-right-header">
          <button
            className="ed-icon-btn"
            onClick={() => setRightCollapsed((v) => !v)}
            title={rightCollapsed ? "Expandir" : "Colapsar"}
          >
            ☰
          </button>
          {!rightCollapsed && (
            <div className="ed-r-tabs">
              {[
                ["ai", "✨"],
                ["stats", "📊"],
                ["characters", "👤"],
                ["comments", "💬"],
                ["notes", "⌨"],
              ].map(([tab, icon]) => (
                <button
                  key={tab}
                  className={`ed-r-tab${rightTab === tab ? " on" : ""}`}
                  onClick={() => setRightTab(tab)}
                  title={tab}
                >
                  {icon}
                  {tab === "comments" &&
                    inlineComments.filter((c) => !c.resolved).length > 0 && (
                      <span className="ed-r-tab-badge">
                        {inlineComments.filter((c) => !c.resolved).length}
                      </span>
                    )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ed-right-content">
          {rightTab === "ai" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">Asistente IA</div>

              <div className="ed-ai-actions">
                <button
                  className="ed-ai-btn primary"
                  onClick={generateAIInsights}
                  disabled={aiLoading}
                >
                  {aiLoading ? "Analizando..." : "Generar feedback y resumen"}
                </button>
                <button
                  className="ed-ai-btn"
                  onClick={exportAISummaryPDF}
                  disabled={
                    !aiInsights?.summary?.logline &&
                    !aiInsights?.summary?.shortSynopsis
                  }
                >
                  Descargar PDF
                </button>
                <button
                  className="ed-ai-btn"
                  onClick={exportAISummaryDOCX}
                  disabled={
                    !aiInsights?.summary?.logline &&
                    !aiInsights?.summary?.shortSynopsis
                  }
                >
                  Descargar Word
                </button>
              </div>

              {aiError && <div className="ed-ai-error">{aiError}</div>}

              {!aiError &&
                !aiLoading &&
                !aiInsights?.summary?.logline &&
                !aiInsights?.summary?.shortSynopsis && (
                  <div className="ed-r-empty">
                    Aún no hay análisis. Usa el botón de IA para obtener
                    feedback del guion y un resumen descargable.
                  </div>
                )}

              {(aiInsights?.summary?.logline ||
                aiInsights?.summary?.shortSynopsis) && (
                <div className="ed-ai-stack">
                  <div className="ed-ai-card">
                    <div className="ed-ai-card-title">Resumen</div>
                    <div className="ed-ai-block">
                      <span className="ed-ai-label">Logline</span>
                      <p>{aiInsights.summary.logline || "-"}</p>
                    </div>
                    <div className="ed-ai-block">
                      <span className="ed-ai-label">Sinopsis breve</span>
                      <p>{aiInsights.summary.shortSynopsis || "-"}</p>
                    </div>
                    <div className="ed-ai-block">
                      <span className="ed-ai-label">Resumen por escenas</span>
                      <ul className="ed-ai-list">
                        {(aiInsights.summary.sceneSummary || []).map(
                          (item, index) => (
                            <li key={`${index}-${item}`}>{item}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="ed-ai-card">
                    <div className="ed-ai-card-title">Feedback</div>
                    <div className="ed-ai-block">
                      <span className="ed-ai-label">Vista general</span>
                      <p>{aiInsights.feedback.overall || "-"}</p>
                    </div>
                    <div className="ed-ai-block">
                      <span className="ed-ai-label">Fortalezas</span>
                      <ul className="ed-ai-list">
                        {(aiInsights.feedback.strengths || []).map(
                          (item, index) => (
                            <li key={`strength-${index}-${item}`}>{item}</li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div className="ed-ai-block">
                      <span className="ed-ai-label">Mejoras sugeridas</span>
                      <ul className="ed-ai-list">
                        {(aiInsights.feedback.improvements || []).map(
                          (item, index) => (
                            <li key={`improvement-${index}-${item}`}>{item}</li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div className="ed-ai-block">
                      <span className="ed-ai-label">Próximos pasos</span>
                      <ul className="ed-ai-list">
                        {(aiInsights.feedback.nextSteps || []).map(
                          (item, index) => (
                            <li key={`next-${index}-${item}`}>{item}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATS */}
          {rightTab === "stats" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">Estadísticas</div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Palabras</span>
                <span className="ed-r-val">{wordCount}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Bloques</span>
                <span className="ed-r-val">{blocks.length}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Escenas</span>
                <span className="ed-r-val">{scenes.length}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Páginas</span>
                <span className="ed-r-val">
                  {pages.length + (showCredits ? 1 : 0)}
                </span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Personajes</span>
                <span className="ed-r-val">{characterNames.length}</span>
              </div>
              <div className="ed-r-row">
                <span className="ed-r-lbl">Comentarios</span>
                <span className="ed-r-val">{inlineComments.length}</span>
              </div>
            </div>
          )}

          {/* CHARACTERS */}
          {rightTab === "characters" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">Personajes</div>
              {characterNames.length === 0 && (
                <div className="ed-r-empty">Ningún personaje aún</div>
              )}
              {characterNames.map((name) => (
                <div className="ed-r-row" key={name}>
                  <span className="ed-r-lbl">{name}</span>
                  <span className="ed-r-val ed-r-char-count">
                    {
                      blocks.filter(
                        (b) =>
                          b.type === "char" && b.val.toUpperCase() === name,
                      ).length
                    }
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* INLINE COMMENTS */}
          {rightTab === "comments" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">
                Comentarios en guión
                {inlineComments.length > 0 && (
                  <span className="ed-r-count">{inlineComments.length}</span>
                )}
              </div>
              {inlineComments.length === 0 ? (
                <div className="ed-r-empty">
                  Sin comentarios aún. Haz clic en 💬 sobre cualquier bloque
                  para agregar uno.
                </div>
              ) : (
                <div className="ed-r-comment-list">
                  {inlineComments.map((c) => {
                    const typeLabel = LABELS[c.blockType] || c.blockType;
                    return (
                      <div
                        key={c.id}
                        className={`ed-r-cmt${c.resolved ? " resolved" : ""}`}
                        onClick={() => {
                          const block = blocks.find((b) => b.id === c.blockId);
                          if (block) focusBlock(block.id);
                        }}
                      >
                        <div className="ed-r-cmt-head">
                          <span className="ed-r-cmt-av">{c.initials}</span>
                          <span className="ed-r-cmt-author">{c.author}</span>
                          <span className="ed-r-cmt-badge">{typeLabel}</span>
                          {c.resolved && (
                            <span className="ed-r-cmt-resolved">✓</span>
                          )}
                        </div>
                        <div className="ed-r-cmt-text">{c.text}</div>
                        <div className="ed-r-cmt-time">{c.time}</div>
                        <div className="ed-r-cmt-actions">
                          <button
                            className="ed-r-cmt-act"
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveInlineComment(c.id);
                            }}
                          >
                            {c.resolved ? "↩ Reabrir" : "✓ Resolver"}
                          </button>
                          <button
                            className="ed-r-cmt-act danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteInlineComment(c.id);
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* NOTES / SHORTCUTS */}
          {rightTab === "notes" && (
            <div className="ed-r-sec">
              <div className="ed-r-ttl">Atajos de teclado</div>

              {[
                ["Enter", "Nuevo bloque"],
                ["Tab", "Cambiar tipo"],
                ["Backspace vacío", "Eliminar bloque"],
                ["Cmd/Ctrl + Z", "Undo"],
                ["Cmd/Ctrl + Shift+Z", "Redo"],
                ["Cmd/Ctrl + S", "Guardar"],
                ["Cmd/Ctrl + ↑/↓", "Navegar bloques"],
                ["/escena", "→ Escena"],
                ["/accion", "→ Acción"],
                ["/personaje", "→ Personaje"],
                ["/dialogo", "→ Diálogo"],
                ["/nota", "→ Nota"],
                ["/acotacion", "→ Acotación"],
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
