const subjectService = require("../services/subject.service");

const createSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.createSubject(req.body);
    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

const getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

const getSubjectsByGrade = async (req, res, next) => {
  try {
    const { gradeId } = req.params;
    const subjects = await subjectService.getSubjectsByGrade(gradeId);
    res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

const getSubjectById = async (req, res, next) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.updateSubject(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    await subjectService.deleteSubject(req.params.id);
    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  getSubjectsByGrade,
  updateSubject,
  deleteSubject,
};
