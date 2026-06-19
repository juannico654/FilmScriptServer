const express = require("express");

const { verifyToken } = require("../middlewares/authMiddleware");
const {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  shareProjectsWithCollaborator,
  sendInviteEmailTest,
  unshareProjectsWithCollaborator,
} = require("../controllers/projectController");

const router = express.Router();

router.use(verifyToken);

router.get("/", listProjects);
router.post("/", createProject);
router.post("/share-team", shareProjectsWithCollaborator);
router.post("/share-team/test-email", sendInviteEmailTest);
router.delete("/share-team", unshareProjectsWithCollaborator);
router.put("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);

module.exports = router;
