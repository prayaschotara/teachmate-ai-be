const teacherService = require("../services/teacher.service");

const registerTeacher = async (req, res, next) => {
  try {
    const teacher = await teacherService.registerTeacher(req.body);
    res.status(201).json({
      success: true,
      message: "Teacher registered successfully",
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

const getAllTeachers = async (req, res, next) => {
  try {
    const teachers = await teacherService.getAllTeachers();
    console.log("teachers", teachers)
    res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherById = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherById(req.params.id);
    res.status(200).json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

const updateTeacher = async (req, res, next) => {
  try {
    const teacher = await teacherService.updateTeacher(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTeacher = async (req, res, next) => {
  try {
    await teacherService.deleteTeacher(req.params.id);
    res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getTeachersBySubject = async (req, res, next) => {
  try {
    const teachers = await teacherService.getTeachersBySubject(req.params.subject);
    res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

const getTeachersByGrade = async (req, res, next) => {
  try {
    const teachers = await teacherService.getTeachersByGrade(req.params.grade);
    res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

const getTeachersByClass = async (req, res, next) => {
  try {
    const teachers = await teacherService.getTeachersByClass(req.params.class);
    res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeachersBySubject,
  getTeachersByGrade,
  getTeachersByClass,
};
