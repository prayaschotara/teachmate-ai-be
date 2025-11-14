const express = require("express");
const router = express.Router();
const {
  createGrade,
  getAllGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
} = require("../controllers/grade.controller");
const validateToken = require("../middlewares/auth-guard");

// All routes require authentication
router.post("/", validateToken, createGrade);
router.get("/", validateToken, getAllGrades);
router.get("/:id", validateToken, getGradeById);
router.put("/:id", validateToken, updateGrade);
router.delete("/:id", validateToken, deleteGrade);

module.exports = router;
