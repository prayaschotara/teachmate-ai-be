const express = require("express");
const router = express.Router();
const {
  registerParents,
  getAllParents,
  getParentsById,
  updateParents,
  deleteParents,
  searchParents,
} = require("../controllers/parents.controller");
const validateToken = require("../middlewares/auth-guard");

// Public routes (no authentication required)
router.post("/register", registerParents);

// Protected routes (authentication required)
router.get("/", validateToken, getAllParents);
router.get("/search", validateToken, searchParents);
router.get("/:id", validateToken, getParentsById);
router.put("/:id", validateToken, updateParents);
router.delete("/:id", validateToken, deleteParents);

module.exports = router;
