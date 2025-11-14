const Chapter = require("../models/Chapters.model");
const Subject = require("../models/Subject.model");
const Grade = require("../models/Grade.model");

const createChapter = async (chapterData) => {
    const { subject_name, grade_name, ...restData } = chapterData;

    // If subject_name is provided, find the subject and get its ID
    if (subject_name) {
        const subject = await Subject.findOne({ subject_name });
        if (!subject) {
            const error = new Error(`Subject with name '${subject_name}' not found`);
            error.statusCode = 404;
            throw error;
        }
        restData.subject_id = subject._id;
        restData.subject_name = subject_name;
    }

    // If grade_name is provided, find the grade and get its ID
    if (grade_name) {
        const grade = await Grade.findOne({ grade_name });
        if (!grade) {
            const error = new Error(`Grade with name '${grade_name}' not found`);
            error.statusCode = 404;
            throw error;
        }
        restData.grade_id = grade._id;
        restData.grade_name = grade_name;
    }

    const chapter = await Chapter.create(restData);
    return chapter;
};

const getAllChapters = async () => {
    const chapters = await Chapter.find();
    console.log(chapters)
    return chapters;
};

const getChapterById = async (id) => {
    const chapter = await Chapter.findById(id);
    if (!chapter) {
        const error = new Error("Chapter not found");
        error.statusCode = 404;
        throw error;
    }
    return chapter;
};

const updateChapter = async (id, chapterData) => {
    const { subject_name, grade_name, ...restData } = chapterData;

    // If subject_name is provided, find the subject and get its ID
    if (subject_name) {
        const subject = await Subject.findOne({ subject_name });
        if (!subject) {
            const error = new Error(`Subject with name '${subject_name}' not found`);
            error.statusCode = 404;
            throw error;
        }
        restData.subject_id = subject._id;
        restData.subject_name = subject_name;
    }

    // If grade_name is provided, find the grade and get its ID
    if (grade_name) {
        const grade = await Grade.findOne({ grade_name });
        if (!grade) {
            const error = new Error(`Grade with name '${grade_name}' not found`);
            error.statusCode = 404;
            throw error;
        }
        restData.grade_id = grade._id;
        restData.grade_name = grade_name;
    }

    const chapter = await Chapter.findByIdAndUpdate(id, restData, {
        new: true,
        runValidators: true,
    });
    if (!chapter) {
        const error = new Error("Chapter not found");
        error.statusCode = 404;
        throw error;
    }
    return chapter;
};

const deleteChapter = async (id) => {
    const chapter = await Chapter.findByIdAndDelete(id);
    if (!chapter) {
        const error = new Error("Chapter not found");
        error.statusCode = 404;
        throw error;
    }
    return chapter;
};

const getChaptersBySubject = async (subjectId) => {
    const chapters = await Chapter.find({ subject_id: subjectId });
    return chapters;
};

const getChaptersByGrade = async (gradeId) => {
    const chapters = await Chapter.find({ grade_id: gradeId });
    return chapters;
};

const getChaptersBySubjectAndGrade = async (subjectId, gradeId) => {
    const chapters = await Chapter.find({
        subject_id: subjectId,
        grade_id: gradeId,
    });
    return chapters;
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
