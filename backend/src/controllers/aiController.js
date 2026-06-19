const {
  generateScriptInsights,
  getMissingAIEnvVars,
  isAIConfigured,
} = require("../services/aiService");

const analyzeScript = async (req, res) => {
  try {
    const { title, script = {} } = req.body || {};
    const blocks = Array.isArray(script.blocks) ? script.blocks : [];
    const credits =
      script.credits && typeof script.credits === "object"
        ? script.credits
        : {};

    if (blocks.length === 0) {
      return res.status(400).json({
        message: "Debes enviar al menos un bloque del guion para analizar.",
      });
    }

    if (!isAIConfigured()) {
      return res.status(503).json({
        message: "La IA no esta configurada en el servidor.",
        missingEnvVars: getMissingAIEnvVars(),
      });
    }

    const result = await generateScriptInsights({ title, credits, blocks });

    return res.json({
      message: "Analisis IA generado correctamente",
      insights: result.insights,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error al generar feedback del guion con IA",
      error: error.message,
    });
  }
};

module.exports = {
  analyzeScript,
};
