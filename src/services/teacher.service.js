const Teacher = require("../models/Teacher.model");
const Grade = require("../models/Grade.model");
const Class = require("../models/Class.model");
const bcrypt = require("bcrypt");

const registerTeacher = async (teacherData) => {
  const { name, email, password, phone, class_names, grade_names, subject_names } = teacherData;

  // Check if teacher already exists
  const existingTeacher = await Teacher.findOne({ email });
  if (existingTeacher) {
    const error = new Error("Teacher with this email already exists");
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Process classes
  let classesArray = [];
  if (class_names && Array.isArray(class_names)) {
    for (const className of class_names) {
      const classDoc = await Class.findOne({ class_name: className });
      if (classDoc) {
        classesArray.push({
          name: className,
          class_id: classDoc._id,
        });
      }
    }
  }

  // Process grades
  let gradesArray = [];
  if (grade_names && Array.isArray(grade_names)) {
    for (const gradeName of grade_names) {
      const grade = await Grade.findOne({ grade_name: gradeName });
      if (grade) {
        gradesArray.push({
          name: gradeName,
          grade_id: grade._id,
        });
      }
    }
  }

  // Process subjects
  let subjectsArray = [];
  if (subject_names && Array.isArray(subject_names)) {
    for (const subjectName of subject_names) {
      // Find all grades for this subject name
      const gradeIds = gradesArray.map((g) => g.grade_id);
      subjectsArray.push({
        name: subjectName,
        grade_ids: gradeIds,
      });
    }
  }

  // Create teacher
  const teacher = await Teacher.create({
    name,
    email,
    password: hashedPassword,
    phone,
    classes: classesArray,
    grades: gradesArray,
    subjects: subjectsArray,
  });

  // Remove password from response
  const teacherObject = teacher.toObject();
  delete teacherObject.password;

  return teacherObject;
};

module.exports = {
  registerTeacher,
};
