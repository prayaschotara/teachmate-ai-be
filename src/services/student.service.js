const Student = require("../models/Student.model");
const Grade = require("../models/Grade.model");
const Class = require("../models/Class.model");
const bcrypt = require("bcrypt");

const registerStudent = async (studentData) => {
  const {
    first_name,
    last_name,
    father_fname,
    father_lname,
    mother_fname,
    mother_lname,
    email,
    password,
    primary_number,
    secondary_number,
    class_name,
    grade_name,
    roll_number,
  } = studentData;

  // Check if student already exists
  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    const error = new Error("Student with this email already exists");
    error.statusCode = 400;
    throw error;
  }

  // Check if roll number already exists in the same class
  const existingRollNumber = await Student.findOne({
    roll_number,
    "class.class_name": class_name,
  });
  if (existingRollNumber) {
    const error = new Error(
      `Roll number ${roll_number} already exists in class ${class_name}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate password exists
  if (!password) {
    const error = new Error("Password is required");
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Find grade
  const grade = await Grade.findOne({ grade_name });
  if (!grade) {
    const error = new Error(`Grade with name '${grade_name}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // Find class
  const classDoc = await Class.findOne({ class_name });
  if (!classDoc) {
    const error = new Error(`Class with name '${class_name}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // Create student
  const student = await Student.create({
    first_name,
    last_name,
    father_fname,
    father_lname,
    mother_fname,
    mother_lname,
    email,
    password: hashedPassword,
    primary_number,
    secondary_number,
    class: {
      class_id: classDoc._id,
      class_name: class_name,
    },
    grade: {
      grade_id: grade._id,
      grade_name: grade_name,
    },
    roll_number,
  });

  // Remove password from response
  const studentObject = student.toObject();
  delete studentObject.password;

  return studentObject;
};

const getAllStudents = async () => {
  const students = await Student.find()
    .populate("class.class_id")
    .populate("grade.grade_id")
    .select("-password");
  return students;
};

const getStudentById = async (id) => {
  const student = await Student.findById(id)
    .populate("class.class_id")
    .populate("grade.grade_id")
    .select("-password");
  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }
  return student;
};

const updateStudent = async (id, studentData) => {
  const { password, class_name, grade_name, roll_number, ...restData } = studentData;

  // Get current student to check class changes
  const currentStudent = await Student.findById(id);
  if (!currentStudent) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  // Determine the class name to check against
  const checkClassName = class_name || currentStudent.class.class_name;
  const checkRollNumber = roll_number || currentStudent.roll_number;

  // Check if roll number already exists in the same class (excluding current student)
  if (roll_number || class_name) {
    const existingRollNumber = await Student.findOne({
      _id: { $ne: id },
      roll_number: checkRollNumber,
      "class.class_name": checkClassName,
    });
    if (existingRollNumber) {
      const error = new Error(
        `Roll number ${checkRollNumber} already exists in class ${checkClassName}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Hash password if provided
  if (password) {
    restData.password = await bcrypt.hash(password, 10);
  }

  // Add roll_number to restData if provided
  if (roll_number) {
    restData.roll_number = roll_number;
  }

  // Find grade if provided
  if (grade_name) {
    const grade = await Grade.findOne({ grade_name });
    if (!grade) {
      const error = new Error(`Grade with name '${grade_name}' not found`);
      error.statusCode = 404;
      throw error;
    }
    restData.grade = {
      grade_id: grade._id,
      grade_name: grade_name,
    };
  }

  // Find class if provided
  if (class_name) {
    const classDoc = await Class.findOne({ class_name });
    if (!classDoc) {
      const error = new Error(`Class with name '${class_name}' not found`);
      error.statusCode = 404;
      throw error;
    }
    restData.class = {
      class_id: classDoc._id,
      class_name: class_name,
    };
  }

  const student = await Student.findByIdAndUpdate(id, restData, {
    new: true,
    runValidators: true,
  })
    .populate("class.class_id")
    .populate("grade.grade_id")
    .select("-password");

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }
  return student;
};

const deleteStudent = async (id) => {
  const student = await Student.findByIdAndDelete(id);
  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }
  return student;
};

const searchStudents = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    // If no search term, return all students
    return await Student.find()
      .populate("class.class_id")
      .populate("grade.grade_id")
      .select("-password")
      .sort({ "grade.grade_name": 1, "class.class_name": 1, roll_number: 1 });
  }

  const trimmedSearch = searchTerm.trim();
  const searchParts = trimmedSearch.split(/\s+/);

  // Build query conditions
  const orConditions = [];

  // Single word search - search in all individual fields
  if (searchParts.length === 1) {
    const searchRegex = new RegExp(trimmedSearch, "i");
    orConditions.push(
      { first_name: searchRegex },
      { last_name: searchRegex },
      { email: searchRegex },
      { father_fname: searchRegex },
      { father_lname: searchRegex },
      { mother_fname: searchRegex },
      { mother_lname: searchRegex },
      { roll_number: searchRegex },
      { "grade.grade_name": searchRegex },
      { "class.class_name": searchRegex },
    );
  }
  // Multiple words - only search for exact full name combinations
  else if (searchParts.length === 2) {
    const firstName = searchParts[0];
    const lastName = searchParts[1];

    const firstRegex = new RegExp(`^${firstName}$`, "i");
    const lastRegex = new RegExp(`^${lastName}$`, "i");

    // Student full name (exact match)
    orConditions.push({
      $and: [
        { first_name: firstRegex },
        { last_name: lastRegex }
      ]
    });

    // Father full name (exact match)
    orConditions.push({
      $and: [
        { father_fname: firstRegex },
        { father_lname: lastRegex }
      ]
    });

    // Mother full name (exact match)
    orConditions.push({
      $and: [
        { mother_fname: firstRegex },
        { mother_lname: lastRegex }
      ]
    });
  }
  // More than 2 words - search for partial matches
  else if (searchParts.length > 2) {
    const firstName = searchParts[0];
    const lastName = searchParts.slice(1).join(" ");

    const firstRegex = new RegExp(firstName, "i");
    const lastRegex = new RegExp(lastName, "i");

    // Student full name
    orConditions.push({
      $and: [
        { first_name: firstRegex },
        { last_name: lastRegex }
      ]
    });

    // Father full name
    orConditions.push({
      $and: [
        { father_fname: firstRegex },
        { father_lname: lastRegex }
      ]
    });

    // Mother full name
    orConditions.push({
      $and: [
        { mother_fname: firstRegex },
        { mother_lname: lastRegex }
      ]
    });
  }

  const students = await Student.find({ $or: orConditions })
    .populate("class.class_id")
    .populate("grade.grade_id")
    .select("-password")
    .sort({ "grade.grade_name": 1, "class.class_name": 1, roll_number: 1 });

  return students;
};

const getStudentsByGrade = async (grade_name) => {
  const students = await Student.find({
    "grade.grade_name": { $regex: new RegExp(`^${grade_name}$`, "i") },
  })
    .populate("class.class_id")
    .populate("grade.grade_id")
    .select("-password");
  return students;
};

const getStudentsByClass = async (class_name) => {
  const students = await Student.find({
    "class.class_name": { $regex: new RegExp(`^${class_name}$`, "i") },
  })
    .populate("class.class_id")
    .populate("grade.grade_id")
    .select("-password");
  return students;
};

module.exports = {
  registerStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  searchStudents,
  getStudentsByGrade,
  getStudentsByClass,
};
