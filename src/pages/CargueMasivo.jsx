import { useState } from "react";
import * as XLSX from "xlsx";
import "../styles/CargueMasivo.css";

export default function CargueMasivo() {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Validar que tenga campos requeridos
  const validarDatos = (data) => {
    const errors = [];
    data.forEach((row, index) => {
      if (!row.nombre?.trim()) errors.push(`Fila ${index + 1}: Falta nombre`);
      if (!row.correo?.trim()) errors.push(`Fila ${index + 1}: Falta correo`);
      if (row.correo && !/\S+@\S+\.\S+/.test(row.correo)) errors.push(`Fila ${index + 1}: Correo inválido`);
    });
    return errors;
  };

  // Parsear Excel
  const parseExcel = (file) => {
    setError("");
    setSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          setError("El archivo está vacío");
          return;
        }

        // Normalizar claves (por si vienen con espacios)
        const normalized = rows.map(row => ({
          nombre: row.nombre || row.Nombre || "",
          correo: row.correo || row.Correo || row.email || row.Email || ""
        }));

        // Validar
        const erroresValidacion = validarDatos(normalized);
        if (erroresValidacion.length > 0) {
          setError(erroresValidacion.join(", "));
          return;
        }

        setFileName(file.name);
        setPreview(normalized);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError("Error al leer el archivo: " + err.message);
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
    if (file?.name.endsWith(".xlsx")) parseExcel(file);
    else setError("Solo se aceptan archivos .xlsx");
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

      const response = await fetch("http://localhost:5000/api/licenses/carga-masiva", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ estudiantes: preview })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error en cargue masivo");
      }

      setSuccess(data.message || "Licencias activadas correctamente");
      setPreview([]);
      setFileName("");
      setTimeout(() => setSuccess(false), 3000);
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
      <p className="cm-sub">Sube un archivo Excel con estudiantes para activar licencias</p>

      {/* MENSAJES */}
      {error && <div className="cm-error">⚠️ {error}</div>}
      {success && <div className="cm-success">✅ Licencias activadas correctamente</div>}

      {/* DROP ZONE */}
      <div 
        className={`cm-drop ${dragActive ? "active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".xlsx" 
          onChange={handleFile}
          disabled={loading}
        />
        <p>📁 Arrastra tu archivo o haz clic</p>
        <small>Formato: .xlsx (Excel)</small>
      </div>

      {fileName && (
        <div className="cm-file">
          📄 {fileName}
        </div>
      )}

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