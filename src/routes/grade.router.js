const express = require("express");
const router = express.Router();
const {
  createGrade,
  getAllGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
} = require("../controllers/grade.controller");

router.post("/", createGrade);
router.get("/", getAllGrades);
router.get("/:id", getGradeById);
router.put("/:id", updateGrade);
router.delete("/:id", deleteGrade);

module.exports = router;
