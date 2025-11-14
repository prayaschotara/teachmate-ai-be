const Subject = require("../models/Subject.model");
const Grade = require("../models/Grade.model");
const Class = require("../models/Class.model");

const createSubject = async (subjectData) => {
  const { grade_name, ...restData } = subjectData;

  // Find grade by grade_name and get its ID
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

  // Find all classes that belong to this grade
  const classes = await Class.find({ grade_name });
  if (classes && classes.length > 0) {
    restData.classes = classes.map((cls) => ({
      class_id: cls._id,
      class_name: cls.class_name,
    }));
  } else {
    restData.classes = [];
  }

  const subject = await Subject.create(restData);
  return subject.populate("grade_id classes.class_id");
};

const getAllSubjects = async () => {
  const subjects = await Subject.find()
    .populate("grade_id")
    .populate("classes.class_id");
  return subjects;
};

const getSubjectById = async (id) => {
  const subject = await Subject.findById(id)
    .populate("grade_id")
    .populate("classes.class_id");
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

const updateSubject = async (id, subjectData) => {
  const { grade_name, ...restData } = subjectData;

  // Find grade by grade_name and get its ID
  if (grade_name) {
    const grade = await Grade.findOne({ grade_name });
    if (!grade) {
      const error = new Error(`Grade with name '${grade_name}' not found`);
      error.statusCode = 404;
      throw error;
    }
    restData.grade_id = grade._id;
    restData.grade_name = grade_name;

    // Find all classes that belong to this grade
    const classes = await Class.find({ grade_name });
    if (classes && classes.length > 0) {
      restData.classes = classes.map((cls) => ({
        class_id: cls._id,
        class_name: cls.class_name,
      }));
    } else {
      restData.classes = [];
    }
  }

  const subject = await Subject.findByIdAndUpdate(id, restData, {
    new: true,
    runValidators: true,
  })
    .populate("grade_id")
    .populate("classes.class_id");
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

const deleteSubject = async (id) => {
  const subject = await Subject.findByIdAndDelete(id);
  if (!subject) {
    const error = new Error("Subject not found");
    error.statusCode = 404;
    throw error;
  }
  return subject;
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
