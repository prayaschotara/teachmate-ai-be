const express = require("express");
const router = express.Router();
const {
  registerTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeachersBySubject,
  getTeachersByGrade,
  getTeachersByClass,
} = require("../controllers/teacher.controller");
const validateToken = require("../middlewares/auth-guard");

// Public routes (no authentication required)
router.post("/register", registerTeacher);

// Protected routes (authentication required)
router.get("/", validateToken, getAllTeachers);
router.get("/:id", validateToken, getTeacherById);
router.put("/:id", validateToken, updateTeacher);
router.delete("/:id", validateToken, deleteTeacher);
router.get("/subject/:subject", validateToken, getTeachersBySubject);
router.get("/grade/:grade", validateToken, getTeachersByGrade);
router.get("/class/:class", validateToken, getTeachersByClass);

module.exports = router;
