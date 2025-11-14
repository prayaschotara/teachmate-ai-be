const express = require("express");
const router = express.Router();
const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  getSubjectsByGrade,
  updateSubject,
  deleteSubject,
} = require("../controllers/subject.controller");
const validateToken = require("../middlewares/auth-guard");

// All routes require authentication
router.post("/", validateToken, createSubject);
router.get("/", validateToken, getAllSubjects);
router.get("/grade/:gradeId", validateToken, getSubjectsByGrade);
router.get("/:id", validateToken, getSubjectById);
router.put("/:id", validateToken, updateSubject);
router.delete("/:id", validateToken, deleteSubject);

module.exports = router;
