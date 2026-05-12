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
  TextRun
} from "docx";

import { saveAs } from "file-saver";

/* ======================================================== */
/* CONSTANTS */
/* ======================================================== */

const LABELS = {
  scene: "escena",
  action: "acción",
  char: "personaje",
  dialog: "diálogo",
  paren: "nota",
  acotation: "acotación"
};

const SLASH_COMMANDS = {
  "/escena": "scene",
  "/accion": "action",
  "/personaje": "char",
  "/dialogo": "dialog",
  "/dialog": "dialog",
  "/nota": "paren",
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
/* BLOCK */
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
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.style.height = "auto";

    ref.current.style.height =
      Math.min(ref.current.scrollHeight, 800) + "px";
  }, [block.val]);

  useEffect(() => {
    if (active && ref.current) {
      ref.current.focus();

      const len = ref.current.value.length;

      ref.current.setSelectionRange(len, len);
    }
  }, [active]);

  return (
    <div
      className={`sblk sblk-${block.type} ${
        active ? "is-active" : ""
      }`}
      ref={blockRef}
    >
      <div className="sblk-lbl">
        {LABELS[block.type]}
      </div>

      <textarea
        ref={ref}
        rows={1}
        spellCheck={false}
        value={block.val}
        placeholder={`Escribe ${LABELS[block.type]}...`}
        className="script-textarea"
        onFocus={() => onFocus(block.id)}
        onChange={(e) =>
          onChange(block.id, e.target.value)
        }
        onKeyDown={(e) =>
          onKeyDown(e, block)
        }
      />

      {block.type === "char" &&
        characterSuggestions.length > 0 && (
          <div className="ed-autocomplete">
            {characterSuggestions.map((name) => (
              <div
                key={name}
                className="ed-autocomplete-item"
                onMouseDown={() =>
                  onSelectCharacter(
                    block.id,
                    name
                  )
                }
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
/* EDITOR */
/* ======================================================== */

export default function Editor({
  initTitle = "Sin título",
  initTemplate,
  onBack
}) {

  /* ==================================================== */
  /* STATE */
  /* ==================================================== */

  const [blocks, setBlocks] = useState([
    {
      id:1,
      type:"scene",
      val:"INT. APARTAMENTO — NOCHE"
    },
    {
      id:2,
      type:"action",
      val:"La lluvia golpea las ventanas."
    }
  ]);

  const [nextId, setNextId] = useState(3);

  const [activeId, setActiveId] =
    useState(1);

  const [showCredits, setShowCredits] =
    useState(true);

  const [zenMode, setZenMode] =
    useState(false);

  const [paperMode, setPaperMode] =
    useState(false);

  const [leftCollapsed, setLeftCollapsed] =
    useState(false);

  const [rightCollapsed, setRightCollapsed] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [rightTab, setRightTab] =
    useState("stats");

  const [history, setHistory] =
    useState([]);

  const [future, setFuture] =
    useState([]);

  const [credits, setCredits] =
    useState({
      title:initTitle,
      writer:"",
      version:"Borrador 1",
      date:new Date().toLocaleDateString(),
      contact:""
    });

  const dragId = useRef(null);

  const refs = useRef({});

  /* ==================================================== */
  /* HISTORY */
  /* ==================================================== */

  const snapshot = useCallback(() => {

    setHistory((prev) => [
      ...prev.slice(-60),
      JSON.stringify(blocks)
    ]);

    setFuture([]);

  }, [blocks]);

  const undo = useCallback(() => {

    if (!history.length) return;

    const previous =
      history[history.length - 1];

    setFuture((f) => [
      JSON.stringify(blocks),
      ...f
    ]);

    setBlocks(JSON.parse(previous));

    setHistory((h) =>
      h.slice(0, -1)
    );

  }, [history, blocks]);

  const redo = useCallback(() => {

    if (!future.length) return;

    const next = future[0];

    setHistory((h) => [
      ...h,
      JSON.stringify(blocks)
    ]);

    setBlocks(JSON.parse(next));

    setFuture((f) =>
      f.slice(1)
    );

  }, [future, blocks]);

  /* ==================================================== */
  /* DERIVED */
  /* ==================================================== */

  const scenes = useMemo(() => {
    return blocks.filter(
      (b) => b.type === "scene"
    );
  }, [blocks]);

  const wordCount = useMemo(() => {

    return blocks.reduce((acc, block) => {

      return (
        acc +
        block.val
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      );

    }, 0);

  }, [blocks]);

  const characterNames = useMemo(() => {

    return [
      ...new Set(
        blocks
          .filter((b) =>
            b.type === "char"
          )
          .map((b) =>
            b.val.toUpperCase()
          )
          .filter(Boolean)
      )
    ];

  }, [blocks]);

  const activeBlock = useMemo(() => {

    return blocks.find(
      (b) => b.id === activeId
    );

  }, [blocks, activeId]);

  /* ==================================================== */
  /* HELPERS */
  /* ==================================================== */

  const focusBlock = (id) => {

    setTimeout(() => {
      setActiveId(id);
    }, 10);

  };

  const getNextType = (type) => {

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
  };

  /* ==================================================== */
  /* CRUD */
  /* ==================================================== */

  const updateBlock = (id, val) => {

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, val }
          : b
      )
    );

  };

  const addBlock = (
    type,
    afterId = null
  ) => {

    snapshot();

    const newBlock = {
      id:nextId,
      type,
      val:
        type === "acotation"
          ? "CORTE A:"
          : ""
    };

    setNextId((n) => n + 1);

    setBlocks((prev) => {

      if (afterId == null) {
        return [...prev, newBlock];
      }

      const idx =
        prev.findIndex(
          (b) => b.id === afterId
        );

      const copy = [...prev];

      copy.splice(idx + 1, 0, newBlock);

      return copy;

    });

    focusBlock(newBlock.id);
  };

  const removeBlock = (id) => {

    if (blocks.length <= 1) return;

    snapshot();

    const currentIndex =
      blocks.findIndex(
        (b) => b.id === id
      );

    const nextFocus =
      blocks[currentIndex - 1] ||
      blocks[currentIndex + 1];

    setBlocks((prev) =>
      prev.filter((b) => b.id !== id)
    );

    if (nextFocus) {
      focusBlock(nextFocus.id);
    }
  };

  /* ==================================================== */
  /* NAVIGATION */
  /* ==================================================== */

  const navigateBlock = (
    currentId,
    direction
  ) => {

    const currentIndex =
      blocks.findIndex(
        (b) => b.id === currentId
      );

    const target =
      blocks[currentIndex + direction];

    if (!target) return;

    focusBlock(target.id);
  };

  /* ==================================================== */
  /* KEYBOARD */
  /* ==================================================== */

  const handleKeyDown = (
    e,
    block
  ) => {

    /* slash commands */

    if (
      e.key === " " &&
      SLASH_COMMANDS[
        block.val.trim()
      ]
    ) {

      e.preventDefault();

      setBlocks((prev) =>
        prev.map((b) =>
          b.id === block.id
            ? {
                ...b,
                type:
                  SLASH_COMMANDS[
                    block.val.trim()
                  ],
                val:""
              }
            : b
        )
      );

      return;
    }

    /* enter */

    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {

      e.preventDefault();

      const nextType =
        getNextType(block.type);

      addBlock(nextType, block.id);

      return;
    }

    /* tab cycle */

    if (e.key === "Tab") {

      e.preventDefault();

      const nextType =
        BLOCK_ORDER[
          (
            BLOCK_ORDER.indexOf(
              block.type
            ) + 1
          ) %
            BLOCK_ORDER.length
        ];

      setBlocks((prev) =>
        prev.map((b) =>
          b.id === block.id
            ? {
                ...b,
                type:nextType
              }
            : b
        )
      );

      return;
    }

    /* backspace */

    if (
      e.key === "Backspace" &&
      !block.val
    ) {

      e.preventDefault();

      removeBlock(block.id);

      return;
    }

    /* arrows */

    if (
      e.key === "ArrowUp" &&
      e.metaKey
    ) {

      e.preventDefault();

      navigateBlock(block.id, -1);

      return;
    }

    if (
      e.key === "ArrowDown" &&
      e.metaKey
    ) {

      e.preventDefault();

      navigateBlock(block.id, 1);

      return;
    }

    /* undo redo */

    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "z"
    ) {

      e.preventDefault();

      if (e.shiftKey) redo();
      else undo();

      return;
    }

    /* save */

    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "s"
    ) {

      e.preventDefault();

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 1600);

      return;
    }
  };

  /* ==================================================== */
  /* SCENES DND */
  /* ==================================================== */

  const reorderScenes = (
    fromId,
    toId
  ) => {

    const fromIndex =
      blocks.findIndex(
        (b) => b.id === fromId
      );

    const toIndex =
      blocks.findIndex(
        (b) => b.id === toId
      );

    if (
      fromIndex === -1 ||
      toIndex === -1
    ) {
      return;
    }

    snapshot();

    const copy = [...blocks];

    const [removed] =
      copy.splice(fromIndex, 1);

    copy.splice(
      toIndex,
      0,
      removed
    );

    setBlocks(copy);
  };

  /* ==================================================== */
  /* EXPORTS */
  /* ==================================================== */

  const exportTXT = () => {

    let content =
      `${credits.title}\n\n`;

    blocks.forEach((b) => {
      content += `${b.val}\n\n`;
    });

    const blob = new Blob(
      [content],
      {
        type:
          "text/plain;charset=utf-8"
      }
    );

    saveAs(
      blob,
      `${credits.title}.txt`
    );
  };

  const exportDOCX = async () => {

    const doc = new Document({
      sections:[
        {
          children:[
            new Paragraph({
              children:[
                new TextRun({
                  text:credits.title,
                  bold:true,
                  size:36
                })
              ]
            }),

            ...blocks.map(
              (b) =>
                new Paragraph({
                  children:[
                    new TextRun({
                      text:b.val
                    })
                  ],
                  spacing:{
                    after:220
                  }
                })
            )
          ]
        }
      ]
    });

    const blob =
      await Packer.toBlob(doc);

    saveAs(
      blob,
      `${credits.title}.docx`
    );
  };

  /* ==================================================== */
  /* SHORTCUTS */
  /* ==================================================== */

  useEffect(() => {

    const handler = (e) => {

      const target =
        e.target.tagName;

      if (
        target === "TEXTAREA" ||
        target === "INPUT"
      ) {
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "1"
      ) {
        addBlock("scene");
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "2"
      ) {
        addBlock("action");
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "3"
      ) {
        addBlock("char");
      }
    };

    window.addEventListener(
      "keydown",
      handler
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handler
      );

  }, []);

  /* ==================================================== */
  /* RENDER */
  /* ==================================================== */

  return (
    <div
      className={[
        "editor-shell",

        zenMode
          ? "zen-mode"
          : "",

        paperMode
          ? "paper-mode"
          : "",

        leftCollapsed
          ? "left-collapsed"
          : "",

        rightCollapsed
          ? "right-collapsed"
          : ""
      ].join(" ")}
    >

      {/* LEFT */}

      <aside
        className={`ed-left ${
          leftCollapsed
            ? "collapsed"
            : ""
        }`}
      >

        <div className="ed-panel-header">

          {!leftCollapsed && (
            <div className="ed-panel-title">
              Escenas
            </div>
          )}

          <button
            className="ed-icon-btn"
            onClick={() =>
              setLeftCollapsed(
                (v) => !v
              )
            }
          >
            ☰
          </button>

        </div>

        {!leftCollapsed && (

          <div className="ed-sc-list">

            {scenes.map(
              (scene, index) => (

                <div
                  key={scene.id}
                  draggable

                  onDragStart={() => {
                    dragId.current =
                      scene.id;
                  }}

                  onDragOver={(e) =>
                    e.preventDefault()
                  }

                  onDrop={() =>
                    reorderScenes(
                      dragId.current,
                      scene.id
                    )
                  }

                  onClick={() =>
                    focusBlock(scene.id)
                  }

                  className={`ed-sc-item ${
                    activeId === scene.id
                      ? "on"
                      : ""
                  }`}
                >

                  <div className="ed-sc-top">

                    <div className="ed-sc-n">
                      ESC {index + 1}
                    </div>

                    <div className="ed-sc-page">
                      p.
                      {Math.ceil(
                        (index + 1) * 1.4
                      )}
                    </div>

                  </div>

                  <div className="ed-sc-t">
                    {scene.val}
                  </div>

                </div>
              )
            )}

          </div>
        )}

      </aside>

      {/* CENTER */}

      <main className="ed-center">

        {/* TOOLBAR */}

        <div className="ed-toolbar">

          <div className="ed-toolbar-group">

            <button
              className="ed-tb-btn"
              onClick={() =>
                addBlock("scene")
              }
            >
              🎬 Escena
            </button>

            <button
              className="ed-tb-btn"
              onClick={() =>
                addBlock("action")
              }
            >
              📝 Acción
            </button>

            <button
              className="ed-tb-btn"
              onClick={() =>
                addBlock("char")
              }
            >
              👤 Personaje
            </button>

            <button
              className="ed-tb-btn"
              onClick={() =>
                addBlock("dialog")
              }
            >
              💬 Diálogo
            </button>

          </div>

          <div className="ed-toolbar-group">

            <button
              className={`ed-tb-btn ${
                zenMode
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setZenMode(
                  (v) => !v
                )
              }
            >
              🧘 Zen
            </button>

            <button
              className={`ed-tb-btn ${
                paperMode
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPaperMode(
                  (v) => !v
                )
              }
            >
              📄 Papel
            </button>

            <button
              className={`ed-tb-btn ${
                showCredits
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setShowCredits(
                  (v) => !v
                )
              }
            >
              🎞 Créditos
            </button>

            <button
              className="ed-tb-btn"
              onClick={() =>
                setRightCollapsed(
                  (v) => !v
                )
              }
            >
              📚 Inspector
            </button>

          </div>

          <div className="ed-toolbar-spacer" />

          <button
            className="ed-tb-btn"
            onClick={undo}
          >
            ↶ Undo
          </button>

          <button
            className="ed-tb-btn"
            onClick={redo}
          >
            ↷ Redo
          </button>

          <button
            className="ed-tb-btn"
            onClick={exportTXT}
          >
            TXT
          </button>

          <button
            className="ed-tb-btn"
            onClick={exportDOCX}
          >
            DOCX
          </button>

          <button className="ed-tb-btn ed-tb-save">
            {saved
              ? "✓ Guardado"
              : "💾 Guardar"}
          </button>

        </div>

        {/* BREADCRUMB */}

        <div className="ed-crumb">

          <button onClick={onBack}>
            ← Volver
          </button>

          <span>/</span>

          <span>
            {credits.title}
          </span>

          {initTemplate && (
            <>
              <span>·</span>
              <span>
                {initTemplate}
              </span>
            </>
          )}

        </div>

        {/* BODY */}

        <div className="ed-body">

          <div className="ed-page">

            <div className="ed-page-paper">

              {/* CREDITS */}

              {showCredits && (

                <div className="sp-credits-page">

                  <div className="sp-credits-inner">

                    <div className="sp-credits-label">
                      PÁGINA DE CRÉDITOS
                    </div>

                    <div className="sp-credits-field">

                      <label className="sp-credits-field-lbl">
                        Título
                      </label>

                      <input
                        className="sp-credits-title-inp"
                        value={credits.title}
                        onChange={(e) =>
                          setCredits(
                            (c) => ({
                              ...c,
                              title:
                                e.target
                                  .value
                            })
                          )
                        }
                      />

                    </div>

                  </div>

                </div>
              )}

              {/* BLOCKS */}

              {blocks.map((block) => {

                const suggestions =
                  block.type === "char"
                    ? characterNames.filter(
                        (c) =>
                          c.startsWith(
                            block.val.toUpperCase()
                          ) &&
                          c !==
                            block.val.toUpperCase()
                      )
                    : [];

                return (

                  <div
                    key={block.id}
                    className="sp-block-wrap"
                  >

                    <ScriptBlock
                      block={block}

                      active={
                        activeId ===
                        block.id
                      }

                      blockRef={(el) =>
                        (refs.current[
                          block.id
                        ] = el)
                      }

                      onFocus={
                        setActiveId
                      }

                      onChange={
                        updateBlock
                      }

                      onKeyDown={
                        handleKeyDown
                      }

                      characterSuggestions={
                        suggestions
                      }

                      onSelectCharacter={(
                        id,
                        value
                      ) =>
                        updateBlock(
                          id,
                          value
                        )
                      }
                    />

                    <div className="sp-block-actions">

                      <button
                        className="sp-bact"
                        onClick={() =>
                          addBlock(
                            "action",
                            block.id
                          )
                        }
                      >
                        ＋
                      </button>

                      <button
                        className="sp-bact danger"
                        onClick={() =>
                          removeBlock(
                            block.id
                          )
                        }
                      >
                        🗑
                      </button>

                    </div>

                  </div>
                );
              })}

              {/* QUICK ADD */}

              <div className="sp-quick-add">

                {[
                  [
                    "scene",
                    "🎬 Escena"
                  ],
                  [
                    "action",
                    "📝 Acción"
                  ],
                  [
                    "char",
                    "👤 Personaje"
                  ],
                  [
                    "dialog",
                    "💬 Diálogo"
                  ],
                  [
                    "paren",
                    "() Nota"
                  ],
                  [
                    "acotation",
                    "⏭ Acotación"
                  ]
                ].map(
                  ([type, label]) => (

                    <button
                      key={type}
                      className="sp-qa-btn"
                      onClick={() =>
                        addBlock(type)
                      }
                    >
                      {label}
                    </button>
                  )
                )}

              </div>

            </div>

          </div>

        </div>

        {/* STATUS */}

        <div className="ed-status">

          <div className="ed-status-dot" />

          <span>
            {wordCount} palabras
          </span>

          <span>·</span>

          <span>
            {blocks.length} bloques
          </span>

          <span>·</span>

          <span>
            {scenes.length} escenas
          </span>

          <span>·</span>

          <span>
            ~
            {Math.ceil(
              wordCount / 220
            )}{" "}
            pág.
          </span>

        </div>

      </main>

      {/* RIGHT */}

      <aside
        className={`ed-right ${
          rightCollapsed
            ? "collapsed"
            : ""
        }`}
      >

        <div className="ed-right-tabs">

          {[
            [
              "inspector",
              "Inspector"
            ],
            [
              "characters",
              "Personajes"
            ],
            [
              "notes",
              "Notas"
            ],
            [
              "stats",
              "Stats"
            ]
          ].map(
            ([id, label]) => (

              <button
                key={id}
                className={`ed-right-tab ${
                  rightTab === id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setRightTab(id)
                }
              >
                {label}
              </button>
            )
          )}

        </div>

        <div className="ed-right-content">

          {/* STATS */}

          {rightTab === "stats" && (

            <div className="ed-r-sec">

              <div className="ed-r-ttl">
                Estadísticas
              </div>

              <div className="ed-r-row">
                <span className="ed-r-lbl">
                  Palabras
                </span>

                <span className="ed-r-val">
                  {wordCount}
                </span>
              </div>

              <div className="ed-r-row">
                <span className="ed-r-lbl">
                  Escenas
                </span>

                <span className="ed-r-val">
                  {scenes.length}
                </span>
              </div>

              <div className="ed-r-row">
                <span className="ed-r-lbl">
                  Páginas aprox.
                </span>

                <span className="ed-r-val">
                  {Math.ceil(
                    wordCount / 220
                  )}
                </span>
              </div>

            </div>
          )}

          {/* CHARACTERS */}

          {rightTab === "characters" && (

            <div className="ed-r-sec">

              <div className="ed-r-ttl">
                Personajes
              </div>

              {characterNames.map(
                (name) => (

                  <div
                    className="ed-r-row"
                    key={name}
                  >

                    <span className="ed-r-lbl">
                      {name}
                    </span>

                  </div>
                )
              )}

            </div>
          )}

          {/* INSPECTOR */}

          {rightTab === "inspector" && (

            <>
              <div className="ed-r-sec">

                <div className="ed-r-ttl">
                  Proyecto
                </div>

                <input
                  className="ed-inp"
                  value={credits.title}
                  onChange={(e) =>
                    setCredits(
                      (c) => ({
                        ...c,
                        title:
                          e.target
                            .value
                      })
                    )
                  }
                />

              </div>

              <div className="ed-r-sec">

                <div className="ed-r-ttl">
                  Bloque activo
                </div>

                <div className="ed-r-row">

                  <span className="ed-r-lbl">
                    Tipo
                  </span>

                  <span className="ed-r-val">
                    {activeBlock
                      ? LABELS[
                          activeBlock.type
                        ]
                      : "-"}
                  </span>

                </div>

              </div>

              <div className="ed-r-sec">

                <div className="ed-r-ttl">
                  Insertar
                </div>

                <div className="fmt-grid">

                  {[
                    [
                      "scene",
                      "🎬 Escena"
                    ],
                    [
                      "action",
                      "📝 Acción"
                    ],
                    [
                      "char",
                      "👤 Personaje"
                    ],
                    [
                      "dialog",
                      "💬 Diálogo"
                    ]
                  ].map(
                    ([type, label]) => (

                      <button
                        key={type}
                        className="fmt-btn"
                        onClick={() =>
                          addBlock(type)
                        }
                      >
                        {label}
                      </button>
                    )
                  )}

                </div>

              </div>
            </>
          )}

          {/* NOTES */}

          {rightTab === "notes" && (

            <div className="ed-r-sec">

              <div className="ed-r-ttl">
                Atajos
              </div>

              <div className="ed-r-row">

                <span className="ed-r-lbl">
                  Enter
                </span>

                <span className="ed-r-val">
                  Nuevo bloque
                </span>

              </div>

              <div className="ed-r-row">

                <span className="ed-r-lbl">
                  Tab
                </span>

                <span className="ed-r-val">
                  Cambiar tipo
                </span>

              </div>

              <div className="ed-r-row">

                <span className="ed-r-lbl">
                  Cmd/Ctrl + Z
                </span>

                <span className="ed-r-val">
                  Undo
                </span>

              </div>

              <div className="ed-r-row">

                <span className="ed-r-lbl">
                  /escena
                </span>

                <span className="ed-r-val">
                  Slash command
                </span>

              </div>

            </div>
          )}

        </div>

      </aside>

    </div>
  );
}
