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

// Test route
router.get("/ping", (req, res) => {
    res.json({ message: "Chapter router is working!" });
});

// Relation-based routes (must come before /:id to avoid conflicts)
router.get("/subject/:subjectId/grade/:gradeId", getChaptersBySubjectAndGrade);
router.get("/subject/:subjectId", getChaptersBySubject);
router.get("/grade/:gradeId", getChaptersByGrade);

// Basic CRUD routes
router.post("/", createChapter);
router.get("/", getAllChapters);
router.get("/:id", getChapterById);
router.put("/:id", updateChapter);
router.delete("/:id", deleteChapter);

module.exports = router;
