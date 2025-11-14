const chapterService = require("../services/chapter.service");

const createChapter = async (req, res, next) => {
    try {
        const chapter = await chapterService.createChapter(req.body);
        res.status(201).json({
            success: true,
            message: "Chapter created successfully",
            data: chapter,
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

const getAllChapters = async (req, res, next) => {
    try {
        const chapters = await chapterService.getAllChapters();
        console.log(">>>> chap", chapters)
        res.status(200).json({
            success: true,
            data: chapters,
        });
    } catch (error) {
        next(error);
    }
};

const getChapterById = async (req, res, next) => {
    try {
        const chapter = await chapterService.getChapterById(req.params.id);
        res.status(200).json({
            success: true,
            data: chapter,
        });
    } catch (error) {
        next(error);
    }
};

const updateChapter = async (req, res, next) => {
    try {
        const chapter = await chapterService.updateChapter(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: "Chapter updated successfully",
            data: chapter,
        });
    } catch (error) {
        next(error);
    }
};

const deleteChapter = async (req, res, next) => {
    try {
        await chapterService.deleteChapter(req.params.id);
        res.status(200).json({
            success: true,
            message: "Chapter deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

const getChaptersBySubject = async (req, res, next) => {
    try {
        const chapters = await chapterService.getChaptersBySubject(
            req.params.subjectId
        );
        res.status(200).json({
            success: true,
            data: chapters,
        });
    } catch (error) {
        next(error);
    }
};

const getChaptersByGrade = async (req, res, next) => {
    try {
        const chapters = await chapterService.getChaptersByGrade(req.params.gradeId);
        res.status(200).json({
            success: true,
            data: chapters,
        });
    } catch (error) {
        next(error);
    }
};

const getChaptersBySubjectAndGrade = async (req, res, next) => {
    try {
        const chapters = await chapterService.getChaptersBySubjectAndGrade(
            req.params.subjectId,
            req.params.gradeId
        );
        res.status(200).json({
            success: true,
            data: chapters,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createChapter,
    getAllChapters,
    getChapterById,
    updateChapter,
    deleteChapter,
    getChaptersBySubject,
    getChaptersByGrade,
    getChaptersBySubjectAndGrade,
};
