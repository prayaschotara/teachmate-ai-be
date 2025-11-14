const express = require("express");
const router = express.Router();
const {
  registerStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  searchStudents,
  getStudentsByGrade,
  getStudentsByClass,
} = require("../controllers/student.controller");
const validateToken = require("../middlewares/auth-guard");

// Public routes (no authentication required)
router.post("/register", registerStudent);

// Protected routes (authentication required)
router.get("/", validateToken, getAllStudents);
router.get("/search", validateToken, searchStudents);
router.get("/grade/:grade", validateToken, getStudentsByGrade);
router.get("/class/:class", validateToken, getStudentsByClass);
router.get("/:id", validateToken, getStudentById);
router.put("/:id", validateToken, updateStudent);
router.delete("/:id", validateToken, deleteStudent);

module.exports = router;
