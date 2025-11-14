const Grade = require("../models/Grade.model");

const createGrade = async (gradeData) => {
  const grade = await Grade.create(gradeData);
  return grade;
};

const getAllGrades = async () => {
  const grades = await Grade.find();
  return grades;
};

const getGradeById = async (id) => {
  const grade = await Grade.findById(id);
  if (!grade) {
    const error = new Error("Grade not found");
    error.statusCode = 404;
    throw error;
  }
  return grade;
};

const updateGrade = async (id, gradeData) => {
  const grade = await Grade.findByIdAndUpdate(id, gradeData, {
    new: true,
    runValidators: true,
  });
  if (!grade) {
    const error = new Error("Grade not found");
    error.statusCode = 404;
    throw error;
  }
  return grade;
};

const deleteGrade = async (id) => {
  const grade = await Grade.findByIdAndDelete(id);
  if (!grade) {
    const error = new Error("Grade not found");
    error.statusCode = 404;
    throw error;
  }
  return grade;
};

module.exports = {
  createGrade,
  getAllGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
};
