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

router.post("/register", registerTeacher);
router.get("/", getAllTeachers);
router.get("/:id", getTeacherById);
router.put("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);
router.get("/subject/:subject", getTeachersBySubject);
router.get("/grade/:grade", getTeachersByGrade);
router.get("/class/:class", getTeachersByClass);

module.exports = router;
