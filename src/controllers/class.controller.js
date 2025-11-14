const classService = require("../services/class.service");

const createClass = async (req, res, next) => {
  try {
    const classDoc = await classService.createClass(req.body);
    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: classDoc,
    });
  } catch (error) {
    next(error);
  }
};

const getAllClasses = async (req, res, next) => {
  try {
    const classes = await classService.getAllClasses();
    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

const getClassById = async (req, res, next) => {
  try {
    const classDoc = await classService.getClassById(req.params.id);
    res.status(200).json({
      success: true,
      data: classDoc,
    });
  } catch (error) {
    next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const classDoc = await classService.updateClass(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: classDoc,
    });
  } catch (error) {
    next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    await classService.deleteClass(req.params.id);
    res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
};
