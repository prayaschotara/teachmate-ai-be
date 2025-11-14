const express = require("express");
const router = express.Router();
const {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
} = require("../controllers/class.controller");
const validateToken = require("../middlewares/auth-guard");

// All routes require authentication
router.post("/", validateToken, createClass);
router.get("/", validateToken, getAllClasses);
router.get("/:id", validateToken, getClassById);
router.put("/:id", validateToken, updateClass);
router.delete("/:id", validateToken, deleteClass);

module.exports = router;
