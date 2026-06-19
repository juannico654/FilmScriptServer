const mongoose = require("mongoose");

const scriptBlockSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    type: { type: String, required: true },
    val: { type: String, default: "" },
  },
  { _id: false },
);

const creditsSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    writer: { type: String, default: "" },
    version: { type: String, default: "" },
    date: { type: String, default: "" },
    contact: { type: String, default: "" },
  },
  { _id: false },
);

const inlineCommentSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    blockId: { type: Number, required: true },
    blockType: { type: String, default: "" },
    text: { type: String, default: "" },
    author: { type: String, default: "" },
    initials: { type: String, default: "" },
    time: { type: String, default: "" },
    resolved: { type: Boolean, default: false },
  },
  { _id: false },
);

const aiInsightsSchema = new mongoose.Schema(
  {
    summary: {
      logline: { type: String, default: "" },
      shortSynopsis: { type: String, default: "" },
      sceneSummary: { type: [String], default: [] },
    },
    feedback: {
      overall: { type: String, default: "" },
      strengths: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
      nextSteps: { type: [String], default: [] },
    },
    generatedAt: { type: String, default: "" },
    model: { type: String, default: "" },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "done"],
      default: "draft",
    },
    template: {
      type: String,
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    ownerName: {
      type: String,
      default: "",
      trim: true,
    },
    collaboratorEmails: {
      type: [String],
      default: [],
    },
    ficha: {
      type: String,
      default: "",
      trim: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    script: {
      blocks: {
        type: [scriptBlockSchema],
        default: [],
      },
      credits: {
        type: creditsSchema,
        default: () => ({}),
      },
      inlineComments: {
        type: [inlineCommentSchema],
        default: [],
      },
      aiInsights: {
        type: aiInsightsSchema,
        default: () => ({
          summary: { logline: "", shortSynopsis: "", sceneSummary: [] },
          feedback: { overall: "", strengths: [], improvements: [], nextSteps: [] },
          generatedAt: "",
          model: "",
        }),
      },
    },
  },
  {
    timestamps: true,
  },
);

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
