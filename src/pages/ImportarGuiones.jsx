import { useMemo, useRef, useState } from "react";
import "../styles/ImportarGuiones.css";
import API_BASE from "../utils/api";

function isSceneHeading(line) {
  const value = line.trim().toUpperCase();
  return /^(INT\.?|EXT\.?|I\/E\.?|INT\/EXT\.?|EXT\/INT\.?)\b/.test(value);
}

function isCharacterCue(line) {
  const value = line.trim();
  if (!value || value.length > 36) return false;
  if (value.startsWith("(") && value.endsWith(")")) return false;
  if (isSceneHeading(value)) return false;
  return value === value.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(value);
}

function isParenthetical(line) {
  const value = line.trim();
  return value.startsWith("(") && value.endsWith(")");
}

function normalizeLines(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

async function readApiResponse(response) {
  const raw = await response.text();
  const contentType = (
    response.headers.get("content-type") || ""
  ).toLowerCase();
  const looksLikeJson =
    contentType.includes("application/json") ||
    raw.trim().startsWith("{") ||
    raw.trim().startsWith("[");

  if (!looksLikeJson) {
    return { data: null, raw };
  }

  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: null, raw };
  }
}

function parseScriptText(text) {
  const lines = normalizeLines(text);
  const blocks = [];
  let nextId = 1;
  let pendingAction = [];
  let pendingDialog = [];
  let mode = null;

  const flushAction = () => {
    if (pendingAction.length === 0) return;
    blocks.push({ id: nextId++, type: "action", val: pendingAction.join(" ") });
    pendingAction = [];
  };

  const flushDialog = () => {
    if (pendingDialog.length === 0) return;
    blocks.push({ id: nextId++, type: "dialog", val: pendingDialog.join(" ") });
    pendingDialog = [];
  };

  const pushBlock = (type, val) => {
    blocks.push({ id: nextId++, type, val });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushAction();
      flushDialog();
      mode = null;
      continue;
    }

    if (isSceneHeading(line)) {
      flushAction();
      flushDialog();
      pushBlock("scene", line.toUpperCase());
      mode = null;
      continue;
    }

    if (isCharacterCue(line)) {
      flushAction();
      flushDialog();
      pushBlock("char", line.toUpperCase());
      mode = "dialog";
      continue;
    }

    if (isParenthetical(line)) {
      flushAction();
      flushDialog();
      pushBlock("paren", line.replace(/^\(|\)$/g, ""));
      mode = "dialog";
      continue;
    }

    if (mode === "dialog") {
      pendingDialog.push(line);
    } else {
      flushDialog();
      pendingAction.push(line);
    }
  }

  flushAction();
  flushDialog();

  return blocks;
}

export default function ImportarGuiones({ onEdit, projects = [], onBack }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [rawText, setRawText] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [title, setTitle] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const stats = useMemo(() => {
    const sceneCount = blocks.filter((block) => block.type === "scene").length;
    return {
      blocks: blocks.length,
      scenes: sceneCount,
      words: countWords(rawText),
    };
  }, [blocks, rawText]);

  const projectNameExists = useMemo(
    () => projects.some((project) => project.name === title.trim()),
    [projects, title],
  );

  const resetPreview = () => {
    setFileName("");
    setFileType("");
    setRawText("");
    setBlocks([]);
    setWarnings([]);
    setError("");
  };

  const handleParse = async (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "doc" && ext !== "docx") {
      setError("Solo se aceptan archivos .doc y .docx.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("El archivo supera el limite de 25 MB permitido para importar.");
      return;
    }

    setLoading(true);
    setError("");
    setFileName(file.name);
    setFileType(ext === "docx" ? ".docx" : ".doc");
    setTitle(file.name.replace(/\.(docx|doc)$/i, ""));
    setRawText("");
    setBlocks([]);
    setWarnings([]);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "No existe token de autenticación. Inicia sesión de nuevo.",
        );
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/api/imports/parse`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const { data, raw } = await readApiResponse(response);

      if (!response.ok) {
        const serverMessage =
          data?.message ||
          (raw?.toLowerCase().includes("doctype")
            ? "El servidor devolvio HTML en lugar de JSON. Revisa VITE_API_URL y el deploy del backend."
            : "No se pudo procesar el archivo");

        throw new Error(`${serverMessage} (HTTP ${response.status})`);
      }

      if (!data || typeof data !== "object") {
        throw new Error(
          "Respuesta invalida del servidor al importar. Verifica que el backend este actualizado.",
        );
      }

      const parsedBlocks = parseScriptText(data.text);
      const baseName = file.name.replace(/\.(docx|doc)$/i, "");

      setTitle(baseName);
      setRawText(data.text || "");
      setBlocks(parsedBlocks);
      setWarnings(data.warnings || []);
    } catch (err) {
      setError(err.message || "Error al importar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) handleParse(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleParse(file);
  };

  const handleConfirmImport = () => {
    if (!blocks.length) return;

    const project = {
      id: Date.now(),
      name: title.trim() || fileName.replace(/\.(docx|doc)$/i, ""),
      meta: `${stats.scenes} escena${stats.scenes === 1 ? "" : "s"} · ${stats.blocks} bloque${stats.blocks === 1 ? "" : "s"}`,
      updatedAt: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "draft",
      script: {
        blocks,
        credits: {
          title: title.trim() || fileName.replace(/\.(docx|doc)$/i, ""),
          writer: "",
          version: "Importado",
          date: new Date().toLocaleDateString(),
          contact: "",
        },
      },
    };

    onEdit(project.name, "Importado", project);
  };

  return (
    <div className="ig-page">
      <div className="ig-hero">
        <div>
          <div className="ig-kicker">Importador de guiones</div>
          <h1>Sube un .doc o .docx y conviértelo en proyecto</h1>
          <p>
            El archivo se procesa en el servidor, se extrae el texto y se arma
            una estructura inicial de escenas, acciones, personajes y diálogos.
          </p>
        </div>
        <button className="ig-back" onClick={onBack} type="button">
          ← Volver
        </button>
      </div>

      <div className="ig-layout">
        <section className="ig-panel">
          <div
            className={`ig-dropzone ${dragActive ? "active" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
            }}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx"
              onChange={handleInputChange}
              style={{ display: "none" }}
            />
            <div className="ig-drop-icon">📄</div>
            <div className="ig-drop-title">Arrastra el archivo o haz clic</div>
            <div className="ig-drop-sub">Formatos soportados: .doc y .docx</div>
          </div>

          {error && <div className="ig-alert error">{error}</div>}
          {warnings.length > 0 && (
            <div className="ig-alert warn">
              <strong>Advertencias</strong>
              <ul>
                {warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {fileName && (
            <div className="ig-file-card">
              <div>
                <div className="ig-file-name">{fileName}</div>
                <div className="ig-file-type">{fileType.toUpperCase()}</div>
              </div>
              <button className="ig-clear" type="button" onClick={resetPreview}>
                Limpiar
              </button>
            </div>
          )}

          <div className="ig-form">
            <label>
              Nombre del proyecto
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del guion"
                disabled={!blocks.length}
              />
            </label>

            <div className="ig-actions">
              <button
                className="ig-primary"
                type="button"
                disabled={!blocks.length || loading}
                onClick={handleConfirmImport}
              >
                Abrir en el editor
              </button>
              <button
                className="ig-secondary"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Elegir otro archivo
              </button>
            </div>
          </div>

          {loading && <div className="ig-loading">Procesando archivo…</div>}
        </section>

        <aside className="ig-aside">
          <div className="ig-summary">
            <div className="ig-summary-title">Resumen</div>
            <div className="ig-summary-grid">
              <div>
                <span>Palabras</span>
                <strong>{stats.words}</strong>
              </div>
              <div>
                <span>Bloques</span>
                <strong>{stats.blocks}</strong>
              </div>
              <div>
                <span>Escenas</span>
                <strong>{stats.scenes}</strong>
              </div>
              <div>
                <span>Proyectos</span>
                <strong>{projects.length}</strong>
              </div>
            </div>
            {projectNameExists && (
              <div className="ig-summary-note">
                Ya existe un proyecto con ese nombre. Puedes abrirlo así o
                cambiarlo antes de guardar.
              </div>
            )}
          </div>

          <div className="ig-preview">
            <div className="ig-summary-title">Vista previa del texto</div>
            {rawText ? (
              <pre>{rawText.slice(0, 2400)}</pre>
            ) : (
              <div className="ig-preview-empty">
                Sube un archivo para ver el texto extraído aquí.
              </div>
            )}
          </div>

          <div className="ig-preview">
            <div className="ig-summary-title">Bloques detectados</div>
            {blocks.length === 0 ? (
              <div className="ig-preview-empty">
                Todavía no hay bloques detectados.
              </div>
            ) : (
              <div className="ig-block-list">
                {blocks.slice(0, 24).map((block) => (
                  <div key={block.id} className={`ig-block ig-${block.type}`}>
                    <span>{block.type}</span>
                    <p>{block.val}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
