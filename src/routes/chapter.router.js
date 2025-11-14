const express = require("express");
const router = express.Router();
const {
    createChapter,
    getAllChapters,
    getChapterById,
    updateChapter,
    deleteChapter,
    getChaptersBySubject,
    getChaptersByGrade,
    getChaptersBySubjectAndGrade,
} = require("../controllers/chapter.controller");
const validateToken = require("../middlewares/auth-guard");

// Test route (no auth required)
router.get("/ping", (req, res) => {
    res.json({ message: "Chapter router is working!" });
});

// All routes require authentication
// Relation-based routes (must come before /:id to avoid conflicts)
router.get("/subject/:subjectId/grade/:gradeId", validateToken, getChaptersBySubjectAndGrade);
router.get("/subject/:subjectId", validateToken, getChaptersBySubject);
router.get("/grade/:gradeId", validateToken, getChaptersByGrade);

// Basic CRUD routes
router.post("/", validateToken, createChapter);
router.get("/", validateToken, getAllChapters);
router.get("/:id", validateToken, getChapterById);
router.put("/:id", validateToken, updateChapter);
router.delete("/:id", validateToken, deleteChapter);

module.exports = router;
