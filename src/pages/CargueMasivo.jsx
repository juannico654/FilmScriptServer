import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import "../styles/CargueMasivo.css";

export default function CargueMasivo() {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [manualNombre, setManualNombre] = useState("");
  const [manualCorreo, setManualCorreo] = useState("");
  const fileInputRef = useRef(null);

  // Validar que tenga campos requeridos
  const validarDatos = (data) => {
    const errors = [];
    data.forEach((row, index) => {
      if (!row.nombre?.trim()) errors.push(`Fila ${index + 1}: Falta nombre`);
      if (!row.correo?.trim()) errors.push(`Fila ${index + 1}: Falta correo`);
      if (row.correo && !/\S+@\S+\.\S+/.test(row.correo))
        errors.push(`Fila ${index + 1}: Correo inválido`);
    });
    return errors;
  };

  // Parsear Excel / CSV
  const parseExcel = (file) => {
    setError("");
    setSuccess("");

    const normalizeKey = (key) =>
      key
        ?.toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .replace(/[_-]+/g, " ") || "";

    const matchesHeader = (value, candidates) =>
      candidates.some((candidate) => value.includes(candidate));

    const findKey = (row, candidates) => {
      const keys = Object.keys(row);
      const found = keys.find((key) =>
        matchesHeader(normalizeKey(key), candidates),
      );
      return found ? row[found]?.toString().trim() : "";
    };

    const combineName = (row) => {
      const name = findKey(row, [
        "nombre",
        "nombres",
        "nombre completo",
        "nombre completo del aprendiz",
        "nombres y apellidos",
        "apellidos y nombres",
        "nombre estudiante",
        "nombre del estudiante",
        "nombre del aprendiz",
        "estudiante",
        "aprendiz",
      ]);

      if (name) return name;

      const first = findKey(row, ["nombres", "nombre"]);
      const last = findKey(row, [
        "apellidos",
        "apellido",
        "apellido paterno",
        "apellido materno",
      ]);

      return [first, last].filter(Boolean).join(" ");
    };

    const findEmail = (row) =>
      findKey(row, [
        "correo",
        "correo electronico",
        "correo electrónico",
        "email",
        "e-mail",
        "email institucional",
        "email_institucional",
        "mail",
      ]);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target.result;
        const workbook = file.name.toLowerCase().endsWith(".csv")
          ? XLSX.read(rawData, { type: "string", raw: false })
          : XLSX.read(new Uint8Array(rawData), { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rowsRaw = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        const cleanedRows = rowsRaw.map((row) =>
          row.map((cell) => cell?.toString().trim() || ""),
        );

        const dataRows = cleanedRows.filter((row) => row.some((cell) => cell));
        if (dataRows.length === 0) {
          setError("El archivo está vacío o no tiene filas válidas");
          return;
        }

        const headerRowIndex = dataRows.findIndex((row) => {
          const rowText = row.map(normalizeKey).join(" ");
          return (
            matchesHeader(rowText, ["correo", "email", "mail"]) &&
            matchesHeader(rowText, [
              "nombre",
              "apellidos",
              "estudiante",
              "aprendiz",
            ])
          );
        });

        if (headerRowIndex === -1) {
          setError(
            "No se encontró una fila de encabezado válida. Asegúrate de que la hoja tenga una fila con correo y nombre.",
          );
          return;
        }

        const headerRow = dataRows[headerRowIndex].map(normalizeKey);
        const rowObjects = dataRows.slice(headerRowIndex + 1).map((row) => {
          const rowObj = {};
          headerRow.forEach((key, index) => {
            rowObj[key] = row[index] || "";
          });
          return rowObj;
        });

        const filteredRows = rowObjects.filter((row) =>
          Object.values(row).some((value) => value?.toString().trim()),
        );

        if (filteredRows.length === 0) {
          setError("No se encontraron filas de datos después del encabezado.");
          return;
        }

        const normalized = filteredRows.map((row, index) => ({
          nombre: combineName(row),
          correo: findEmail(row),
          fila: index + headerRowIndex + 2,
          raw: row,
        }));

        const erroresValidacion = validarDatos(normalized);
        if (erroresValidacion.length > 0) {
          setError(erroresValidacion.join(", "));
          return;
        }

        setFileName(file.name);
        setPreview(normalized);
      };

      if (file.name.toLowerCase().endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      setError("Error al leer el archivo: " + err.message);
    }
  };

  const handleAgregarManual = async () => {
    setError("");
    setSuccess("");

    if (!manualNombre.trim() || !manualCorreo.trim()) {
      setError("Nombre y correo son obligatorios para agregar manualmente.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(manualCorreo)) {
      setError("Correo inválido");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No existe token de autenticación. Haz login primero.");
      }

      const response = await fetch(
        "http://localhost:5000/api/licenses/carga-masiva",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            estudiantes: [
              { nombre: manualNombre.trim(), correo: manualCorreo.trim() },
            ],
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al agregar estudiante");
      }

      setSuccess(
        data.message || "Estudiante agregado y licencia generada correctamente",
      );
      setManualNombre("");
      setManualCorreo("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Error al agregar estudiante: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
  };

  // Drag and Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.name.match(/\.(xlsx|xls|csv)$/i)) {
      parseExcel(file);
    } else {
      setError("Solo se aceptan archivos .xls, .xlsx o .csv");
    }
  };

  // Confirmar importación y enviar al backend
  const handleConfirmar = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No existe token de autenticación. Haz login primero.");
      }

      const response = await fetch(
        "http://localhost:5000/api/licenses/carga-masiva",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estudiantes: preview }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error en cargue masivo");
      }

      setSuccess(data.message || "Licencias activadas correctamente");
      setPreview([]);
      setFileName("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Error al confirmar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setFileName("");
    setPreview([]);
    setError("");
  };

  return (
    <div className="cm-container">
      <h2 className="cm-title">Cargue masivo de aprendices</h2>
      <p className="cm-sub">
        Sube un archivo Excel con estudiantes para activar licencias
      </p>

      {/* MENSAJES */}
      {error && <div className="cm-error">⚠️ {error}</div>}
      {success && <div className="cm-success">✅ {success}</div>}

      {/* DROP ZONE */}
      <div
        className={`cm-drop ${dragActive ? "active" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={handleFile}
          disabled={loading}
          style={{ display: "none" }}
        />
        <p>📁 Arrastra tu archivo o haz clic</p>
        <small>Formato: .xls, .xlsx o .csv con encabezados válidos</small>
      </div>

      {fileName && <div className="cm-file">📄 {fileName}</div>}

      <div className="cm-manual-add">
        <h3>Agregar estudiante manualmente</h3>
        <div className="cm-manual-fields">
          <input
            type="text"
            placeholder="Nombre completo"
            value={manualNombre}
            onChange={(e) => setManualNombre(e.target.value)}
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={manualCorreo}
            onChange={(e) => setManualCorreo(e.target.value)}
            disabled={loading}
          />
          <button
            className="cm-btn"
            type="button"
            onClick={handleAgregarManual}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Agregar estudiante"}
          </button>
        </div>
      </div>

      {/* PREVIEW */}
      {preview.length > 0 && (
        <div className="cm-preview">
          <h3>Vista previa ({preview.length} estudiantes)</h3>

          <div className="cm-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{p.nombre}</td>
                    <td>{p.correo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cm-actions">
            <button
              className="cm-btn"
              onClick={handleConfirmar}
              disabled={loading}
            >
              {loading ? "Procesando..." : "✓ Confirmar importación"}
            </button>
            <button
              className="cm-btn cancel"
              onClick={handleCancelar}
              disabled={loading}
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
