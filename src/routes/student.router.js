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

router.post("/register", registerStudent);
router.get("/", getAllStudents);
router.get("/search", searchStudents);
router.get("/grade/:grade", getStudentsByGrade);
router.get("/class/:class", getStudentsByClass);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

module.exports = router;
