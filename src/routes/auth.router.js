const express = require("express");
const router = express.Router();
const { login, getCurrentUser } = require("../controllers/auth.controller");
const validateToken = require("../middlewares/auth-guard");

// Public routes
router.post("/login", login);

// Protected routes
router.get("/current-user", validateToken, getCurrentUser);

module.exports = router;
