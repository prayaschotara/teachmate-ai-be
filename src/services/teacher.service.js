const Teacher = require("../models/Teacher.model");
const bcrypt = require("bcrypt");

const registerTeacher = async (teacherData) => {
  const {
    name,
    email,
    password,
    phone,
    classes,
    grades,
    subject,
  } = teacherData;

  // Check if teacher already exists
  const existingTeacher = await Teacher.findOne({ email });
  if (existingTeacher) {
    const error = new Error("Teacher with this email already exists");
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create teacher
  const teacher = await Teacher.create({
    name,
    email,
    password: hashedPassword,
    phone,
    classes,
    grades,
    subject,
  });

  // Remove password from response
  const teacherObject = teacher.toObject();
  delete teacherObject.password;

  return teacherObject;
};

module.exports = {
  registerTeacher,
};
