const path = require("node:path");
const mammoth = require("mammoth");
const WordExtractor = require("word-extractor");

const extractor = new WordExtractor();

const allowedExtensions = new Set([".doc", ".docx"]);

async function extractTextFromFile(fileBuffer, originalName) {
  const ext = path.extname(originalName || "").toLowerCase();

  if (!allowedExtensions.has(ext)) {
    throw new Error("Solo se permiten archivos .doc y .docx");
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return {
      text: result.value || "",
      warnings: (result.messages || []).map((message) => message.message),
    };
  }

  const doc = await extractor.extract(fileBuffer);
  return {
    text: doc.getBody() || "",
    warnings: [],
  };
}

const parseScript = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se recibió ningún archivo" });
  }

  try {
    const result = await extractTextFromFile(
      req.file.buffer,
      req.file.originalname,
    );

    return res.json({
      message: "Archivo procesado correctamente",
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      text: result.text,
      warnings: result.warnings,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "No se pudo procesar el archivo",
    });
  }
};

module.exports = {
  parseScript,
};
