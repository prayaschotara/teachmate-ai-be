const express = require("express");
const router = express.Router();
const { registerTeacher } = require("../controllers/teacher.controller");

router.post("/register", registerTeacher);

module.exports = router;
