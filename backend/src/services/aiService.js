const AI_API_URL =
  process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
const AI_MODEL = process.env.AI_MODEL || "gpt-4.1-mini";

const isAIConfigured = () => Boolean(process.env.AI_API_KEY);

const getMissingAIEnvVars = () => {
  const missing = [];
  if (!process.env.AI_API_KEY) missing.push("AI_API_KEY");
  return missing;
};

const normalizeBlockText = (block = {}) => {
  const typeLabels = {
    scene: "ESCENA",
    action: "ACCION",
    char: "PERSONAJE",
    dialog: "DIALOGO",
    paren: "NOTA",
    acotation: "ACOTACION",
  };

  return `[${typeLabels[block.type] || "BLOQUE"}] ${String(block.val || "").trim()}`;
};

const buildScriptText = ({ title, credits = {}, blocks = [] }) => {
  const header = [
    `Titulo: ${title || credits.title || "Sin titulo"}`,
    `Autor: ${credits.writer || "No indicado"}`,
    `Version: ${credits.version || "No indicada"}`,
    `Fecha: ${credits.date || "No indicada"}`,
    "",
    "Guion:",
  ];

  const scriptLines = blocks.map(normalizeBlockText);
  return [...header, ...scriptLines].join("\n");
};

const extractJsonObject = (content = "") => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("La respuesta de IA no devolvio JSON valido");
  }
  return JSON.parse(content.slice(start, end + 1));
};

const sanitizeInsights = (payload = {}) => ({
  summary: {
    logline: String(payload?.summary?.logline || "").trim(),
    shortSynopsis: String(payload?.summary?.shortSynopsis || "").trim(),
    sceneSummary: Array.isArray(payload?.summary?.sceneSummary)
      ? payload.summary.sceneSummary
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [],
  },
  feedback: {
    overall: String(payload?.feedback?.overall || "").trim(),
    strengths: Array.isArray(payload?.feedback?.strengths)
      ? payload.feedback.strengths
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [],
    improvements: Array.isArray(payload?.feedback?.improvements)
      ? payload.feedback.improvements
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [],
    nextSteps: Array.isArray(payload?.feedback?.nextSteps)
      ? payload.feedback.nextSteps
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [],
  },
  generatedAt: new Date().toISOString(),
  model: AI_MODEL,
});

const generateScriptInsights = async ({ title, credits, blocks }) => {
  if (!isAIConfigured()) {
    return {
      configured: false,
      missingEnvVars: getMissingAIEnvVars(),
    };
  }

  const scriptText = buildScriptText({ title, credits, blocks });
  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Eres un analista de guion cinematografico. Respondes siempre en espanol y devuelves unicamente JSON valido.",
        },
        {
          role: "user",
          content: [
            "Analiza el siguiente guion y devuelve solo un objeto JSON con esta estructura exacta:",
            "{",
            '  "summary": {',
            '    "logline": "",',
            '    "shortSynopsis": "",',
            '    "sceneSummary": ["", "", ""]',
            "  },",
            '  "feedback": {',
            '    "overall": "",',
            '    "strengths": ["", "", ""],',
            '    "improvements": ["", "", ""],',
            '    "nextSteps": ["", "", ""]',
            "  }",
            "}",
            "Haz feedback concreto y util para mejorar ritmo, claridad, conflicto y dialogo cuando aplique.",
            "Cada elemento debe ser breve y accionable.",
            "",
            scriptText,
          ].join("\n"),
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "No se pudo generar el analisis IA",
    );
  }

  const content = data?.choices?.[0]?.message?.content || "";
  return {
    configured: true,
    insights: sanitizeInsights(extractJsonObject(content)),
  };
};

module.exports = {
  AI_MODEL,
  isAIConfigured,
  getMissingAIEnvVars,
  generateScriptInsights,
};
