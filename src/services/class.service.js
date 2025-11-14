const Class = require("../models/Class.model");
const Grade = require("../models/Grade.model");

const createClass = async (classData) => {
  const { grade_name, ...restData } = classData;

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

  const classDoc = await Class.create(restData);
  return classDoc.populate("grade_id");
};

const getAllClasses = async () => {
  const classes = await Class.find().populate("grade_id");
  return classes;
};

const getClassById = async (id) => {
  const classDoc = await Class.findById(id).populate("grade_id");
  if (!classDoc) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    throw error;
  }
  return classDoc;
};

const updateClass = async (id, classData) => {
  const { grade_name, ...restData } = classData;

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

  const classDoc = await Class.findByIdAndUpdate(id, restData, {
    new: true,
    runValidators: true,
  }).populate("grade_id");
  if (!classDoc) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    throw error;
  }
  return classDoc;
};

const deleteClass = async (id) => {
  const classDoc = await Class.findByIdAndDelete(id);
  if (!classDoc) {
    const error = new Error("Class not found");
    error.statusCode = 404;
    throw error;
  }
  return classDoc;
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
};
