import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import "../styles/CargueMasivo.css";
import API_BASE from "../utils/api";

const DEFAULT_HEADERS = [
  "tipo de documento",
  "numero de documento",
  "primer apellido",
  "segundo apellido",
  "primer nombre",
  "otros nombres",
  "correo electronico",
  "telefono",
  "ficha",
  "programa de formacion",
];

const SENA_HEADER_CANDIDATES = [
  "tipo de documento",
  "documento",
  "numero de documento",
  "identificacion",
  "primer apellido",
  "segundo apellido",
  "apellidos",
  "primer nombre",
  "otros nombres",
  "nombres",
  "correo",
  "email",
  "telefono",
  "celular",
  "ficha",
  "programa de formacion",
  "programa",
  "aprendiz",
  "estudiante",
];

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

  const first = findKey(row, [
    "primer nombre",
    "otros nombres",
    "nombres",
    "nombre",
  ]);
  const last = findKey(row, [
    "primer apellido",
    "segundo apellido",
    "apellidos",
    "apellido",
    "apellido paterno",
    "apellido materno",
  ]);

  const firstName = findKey(row, ["primer nombre", "nombre"]);
  const otherNames = findKey(row, ["otros nombres", "segundo nombre"]);
  const firstLastName = findKey(row, ["primer apellido", "apellido"]);
  const secondLastName = findKey(row, ["segundo apellido"]);

  const senaName = [firstName, otherNames, firstLastName, secondLastName]
    .filter(Boolean)
    .join(" ");

  if (senaName) return senaName;

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

const buildManualState = (headers) =>
  headers.reduce((accumulator, header) => {
    accumulator[header] = "";
    return accumulator;
  }, {});

const getFieldLabel = (header) => {
  const clean = String(header || "").trim();
  if (!clean) return "Campo";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const getFieldType = (header) =>
  matchesHeader(normalizeKey(header), ["correo", "email", "mail"])
    ? "email"
    : "text";

const formatDocumento = (student) => {
  const perfil = student?.perfilSena || {};
  const tipo = perfil.tipoDocumento || "";
  const numero = perfil.numeroDocumento || "";
  return [tipo, numero].filter(Boolean).join(" ") || "-";
};

const countHeaderMatches = (row) => {
  const normalizedCells = row.map(normalizeKey).filter(Boolean);
  return normalizedCells.reduce((count, cell) => {
    return count + (matchesHeader(cell, SENA_HEADER_CANDIDATES) ? 1 : 0);
  }, 0);
};

export default function CargueMasivo() {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState(DEFAULT_HEADERS);
  const [manualData, setManualData] = useState(
    buildManualState(DEFAULT_HEADERS),
  );
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const cargarEstudiantes = async () => {
    setStudentsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setStudents([]);
        return;
      }

      const response = await fetch(`${API_BASE}/api/licenses/estudiantes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "No se pudo cargar la lista de estudiantes",
        );
      }

      setStudents(Array.isArray(data.estudiantes) ? data.estudiantes : []);
    } catch (err) {
      setStudents([]);
      setError(
        (currentError) =>
          currentError || `Error al cargar estudiantes: ${err.message}`,
      );
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    cargarEstudiantes();
  }, []);

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

        let headerRowIndex = -1;
        let bestScore = 0;

        dataRows.forEach((row, index) => {
          const rowText = row.map(normalizeKey).join(" ");
          const score = countHeaderMatches(row);
          const hasIdentitySignals =
            matchesHeader(rowText, [
              "nombre",
              "nombres",
              "apellido",
              "aprendiz",
              "estudiante",
              "documento",
              "correo",
              "ficha",
            ]) && score >= 2;

          if (hasIdentitySignals && score > bestScore) {
            bestScore = score;
            headerRowIndex = index;
          }
        });

        if (headerRowIndex === -1) {
          setError(
            "No se encontró una fila de encabezado válida. Asegúrate de que la hoja tenga columnas del formato SENA, como nombres, apellidos, documento, ficha o correo.",
          );
          return;
        }

        const headerRow = dataRows[headerRowIndex].map(normalizeKey);
        const validHeaders = headerRow.filter(Boolean);
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

        setExcelHeaders(validHeaders.length ? validHeaders : DEFAULT_HEADERS);
        setManualData(
          buildManualState(
            validHeaders.length ? validHeaders : DEFAULT_HEADERS,
          ),
        );
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

    const emptyField = excelHeaders.find(
      (header) => !String(manualData[header] || "").trim(),
    );
    if (emptyField) {
      setError(`Completa el campo obligatorio: ${getFieldLabel(emptyField)}.`);
      return;
    }

    const manualRow = excelHeaders.reduce((accumulator, header) => {
      accumulator[header] = String(manualData[header] || "").trim();
      return accumulator;
    }, {});

    const manualNombre = combineName(manualRow);
    const manualCorreo = findEmail(manualRow);

    if (!manualNombre || !manualCorreo) {
      setError(
        "El formulario manual debe incluir un nombre y un correo válidos.",
      );
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

      const response = await fetch(`${API_BASE}/api/licenses/carga-masiva`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          estudiantes: [
            {
              nombre: manualNombre.trim(),
              correo: manualCorreo.trim(),
              raw: manualRow,
            },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al agregar estudiante");
      }

      setSuccess(
        data.message || "Estudiante agregado y licencia generada correctamente",
      );
      setManualData(buildManualState(excelHeaders));
      await cargarEstudiantes();
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

      const response = await fetch(`${API_BASE}/api/licenses/carga-masiva`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estudiantes: preview }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error en cargue masivo");
      }

      setSuccess(data.message || "Licencias activadas correctamente");
      setPreview([]);
      setFileName("");
      await cargarEstudiantes();
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
        <p className="cm-manual-note">
          Completa los mismos campos detectados en el Excel para registrar un
          estudiante manualmente.
        </p>
        <div className="cm-manual-fields">
          {excelHeaders.map((header) => (
            <label key={header} className="cm-field">
              <span>{getFieldLabel(header)}</span>
              <input
                type={getFieldType(header)}
                placeholder={getFieldLabel(header)}
                value={manualData[header] || ""}
                onChange={(e) =>
                  setManualData((currentData) => ({
                    ...currentData,
                    [header]: e.target.value,
                  }))
                }
                disabled={loading}
              />
            </label>
          ))}
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

      <div className="cm-preview cm-students-panel">
        <div className="cm-panel-head">
          <h3>Estudiantes registrados</h3>
          <span>
            {studentsLoading ? "Cargando..." : `${students.length} estudiantes`}
          </span>
        </div>

        {students.length === 0 ? (
          <div className="cm-empty">
            {studentsLoading
              ? "Consultando estudiantes..."
              : "Todavía no hay estudiantes registrados para mostrar."}
          </div>
        ) : (
          <div className="cm-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estudiante</th>
                  <th>Documento</th>
                  <th>Correo</th>
                  <th>Ficha</th>
                  <th>Programa</th>
                  <th>Licencia</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student._id || `${student.email}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{student.name}</td>
                    <td>{formatDocumento(student)}</td>
                    <td>{student.email}</td>
                    <td>{student.perfilSena?.ficha || "-"}</td>
                    <td>{student.perfilSena?.programaFormacion || "-"}</td>
                    <td>{student.licencia?.estado || "Sin licencia"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
