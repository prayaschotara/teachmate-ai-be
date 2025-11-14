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

router.post("/", createSubject);
router.get("/", getAllSubjects);
router.get("/grade/:gradeId", getSubjectsByGrade);
router.get("/:id", getSubjectById);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

module.exports = router;
