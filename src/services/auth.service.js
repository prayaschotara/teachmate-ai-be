const Teacher = require("../models/Teacher.model");
const Student = require("../models/Student.model");
const Parents = require("../models/Parents.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (email, password, role) => {
  // Validate role
  const validRoles = ["teacher", "student", "parent"];
  if (!validRoles.includes(role)) {
    const error = new Error("Invalid role. Must be 'teacher', 'student', or 'parent'");
    error.statusCode = 400;
    throw error;
  }

  let user;
  let Model;

  // Select the appropriate model based on role
  switch (role) {
    case "teacher":
      Model = Teacher;
      break;
    case "student":
      Model = Student;
      break;
    case "parent":
      Model = Parents;
      break;
  }

  // Find user by email
  user = await Model.findOne({ email });
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Check if user is active
  if (!user.isActive) {
    const error = new Error("Account is inactive. Please contact administrator");
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Prepare user data for token
  const tokenPayload = {
    id: user._id,
    email: user.email,
    role: role,
  };

  // Add name based on role
  if (role === "teacher") {
    tokenPayload.name = user.name;
  } else if (role === "student") {
    tokenPayload.name = `${user.first_name} ${user.last_name}`;
  } else if (role === "parent") {
    const parentName = user.father_fname 
      ? `${user.father_fname} ${user.father_lname}`
      : `${user.mother_fname} ${user.mother_lname}`;
    tokenPayload.name = parentName;
  }

  // Generate JWT token with 1 month expiration
  const token = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  // Remove password from response
  const userObject = user.toObject();
  delete userObject.password;

  return {
    token,
    user: userObject,
    role: role,
  };
};

const getCurrentUser = async (userId, role) => {
  // Validate role
  const validRoles = ["teacher", "student", "parent"];
  if (!validRoles.includes(role)) {
    const error = new Error("Invalid role");
    error.statusCode = 400;
    throw error;
  }

  let Model;

  // Select the appropriate model based on role
  switch (role) {
    case "teacher":
      Model = Teacher;
      break;
    case "student":
      Model = Student;
      break;
    case "parent":
      Model = Parents;
      break;
  }

  // Find user by ID
  const user = await Model.findById(userId).select("-password");
  
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Check if user is active
  if (!user.isActive) {
    const error = new Error("Account is inactive");
    error.statusCode = 403;
    throw error;
  }

  return {
    user: user,
    role: role,
  };
};

module.exports = {
  login,
  getCurrentUser,
};
