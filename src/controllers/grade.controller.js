const gradeService = require("../services/grade.service");

const createGrade = async (req, res, next) => {
  try {
    const grade = await gradeService.createGrade(req.body);
    res.status(201).json({
      success: true,
      message: "Grade created successfully",
      data: grade,
    });
  } catch (error) {
    next(error);
  }
};

const getAllGrades = async (req, res, next) => {
  try {
    const grades = await gradeService.getAllGrades();
    res.status(200).json({
      success: true,
      data: grades,
    });
  } catch (error) {
    next(error);
  }
};

const getGradeById = async (req, res, next) => {
  try {
    const grade = await gradeService.getGradeById(req.params.id);
    res.status(200).json({
      success: true,
      data: grade,
    });
  } catch (error) {
    next(error);
  }
};

const updateGrade = async (req, res, next) => {
  try {
    const grade = await gradeService.updateGrade(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Grade updated successfully",
      data: grade,
    });
  } catch (error) {
    next(error);
  }
};

const deleteGrade = async (req, res, next) => {
  try {
    await gradeService.deleteGrade(req.params.id);
    res.status(200).json({
      success: true,
      message: "Grade deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGrade,
  getAllGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
};
