const Teacher = require("../models/Teacher.model");
const Grade = require("../models/Grade.model");
const Class = require("../models/Class.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

const getAllTeachers = async () => {
  const teachers = await Teacher.find()
    .populate("classes.class_id")
    .populate("grades.grade_id")
    .populate("subjects.grade_ids")
    .select("-password");
  return teachers;
};

const getTeacherById = async (id) => {
  const teacher = await Teacher.findById(id)
    .populate("classes.class_id")
    .populate("grades.grade_id")
    .populate("subjects.grade_ids")
    .select("-password");
  if (!teacher) {
    const error = new Error("Teacher not found");
    error.statusCode = 404;
    throw error;
  }
  return teacher;
};

const updateTeacher = async (id, teacherData) => {
  const { password, class_names, grade_names, subject_names, ...restData } = teacherData;

  // Hash password if provided
  if (password) {
    restData.password = await bcrypt.hash(password, 10);
  }

  // Process classes if provided
  if (class_names && Array.isArray(class_names)) {
    let classesArray = [];
    for (const className of class_names) {
      const classDoc = await Class.findOne({ class_name: className });
      if (classDoc) {
        classesArray.push({
          name: className,
          class_id: classDoc._id,
        });
      }
    }
    restData.classes = classesArray;
  }

  // Process grades if provided
  if (grade_names && Array.isArray(grade_names)) {
    let gradesArray = [];
    for (const gradeName of grade_names) {
      const grade = await Grade.findOne({ grade_name: gradeName });
      if (grade) {
        gradesArray.push({
          name: gradeName,
          grade_id: grade._id,
        });
      }
    }
    restData.grades = gradesArray;

    // Process subjects if provided
    if (subject_names && Array.isArray(subject_names)) {
      let subjectsArray = [];
      for (const subjectName of subject_names) {
        const gradeIds = gradesArray.map((g) => g.grade_id);
        subjectsArray.push({
          name: subjectName,
          grade_ids: gradeIds,
        });
      }
      restData.subjects = subjectsArray;
    }
  }

  const teacher = await Teacher.findByIdAndUpdate(id, restData, {
    new: true,
    runValidators: true,
  })
    .populate("classes.class_id")
    .populate("grades.grade_id")
    .populate("subjects.grade_ids")
    .select("-password");

  if (!teacher) {
    const error = new Error("Teacher not found");
    error.statusCode = 404;
    throw error;
  }
  return teacher;
};

const deleteTeacher = async (id) => {
  const teacher = await Teacher.findByIdAndDelete(id);
  if (!teacher) {
    const error = new Error("Teacher not found");
    error.statusCode = 404;
    throw error;
  }
  return teacher;
};

const getTeachersBySubject = async (subjectName) => {
  const teachers = await Teacher.find({
    "subjects.name": { $regex: new RegExp(`^${subjectName}$`, "i") },
  })
    .populate("classes.class_id")
    .populate("grades.grade_id")
    .populate("subjects.grade_ids")
    .select("-password");
  return teachers;
};

const getTeachersByGrade = async (gradeName) => {
  const teachers = await Teacher.find({
    "grades.name": { $regex: new RegExp(`^${gradeName}$`, "i") },
  })
    .populate("classes.class_id")
    .populate("grades.grade_id")
    .populate("subjects.grade_ids")
    .select("-password");
  return teachers;
};

const getTeachersByClass = async (className) => {
  const teachers = await Teacher.find({
    "classes.name": { $regex: new RegExp(`^${className}$`, "i") },
  })
    .populate("classes.class_id")
    .populate("grades.grade_id")
    .populate("subjects.grade_ids")
    .select("-password");
  return teachers;
};

const loginTeacher = async (email, password) => {
  // Find teacher by email
  const teacher = await Teacher.findOne({ email });
  if (!teacher) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Check if teacher is active
  if (!teacher.isActive) {
    const error = new Error("Account is inactive. Please contact administrator");
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, teacher.password);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token with 1 month expiration
  const token = jwt.sign(
    {
      id: teacher._id,
      email: teacher.email,
      name: teacher.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" } // 1 month = 30 days
  );

  // Remove password from response
  const teacherObject = teacher.toObject();
  delete teacherObject.password;

  return {
    token,
    teacher: teacherObject,
  };
};

module.exports = {
  registerTeacher,
  loginTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeachersBySubject,
  getTeachersByGrade,
  getTeachersByClass,
};
