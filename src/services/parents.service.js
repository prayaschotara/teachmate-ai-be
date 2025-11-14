const Parents = require("../models/Parents.model");
const Student = require("../models/Student.model");
const bcrypt = require("bcrypt");

const registerParents = async (parentsData) => {
  const {
    father_fname,
    father_lname,
    mother_fname,
    mother_lname,
    email,
    password,
    primary_number,
    secondary_number,
    student_info,
  } = parentsData;

  // Check if parents already exist
  const existingParents = await Parents.findOne({ email });
  if (existingParents) {
    const error = new Error("Parents with this email already exists");
    error.statusCode = 400;
    throw error;
  }

  // Validate password exists
  if (!password) {
    const error = new Error("Password is required");
    error.statusCode = 400;
    throw error;
  }

  // Validate student_info exists
  if (!student_info || !Array.isArray(student_info) || student_info.length === 0) {
    const error = new Error("At least one student information is required");
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Find students by name, class, and grade
  const childInfoArray = [];
  for (const studentData of student_info) {
    const { name, class: className, grade: gradeName } = studentData;

    if (!name || !className || !gradeName) {
      const error = new Error("Student name, class, and grade are required");
      error.statusCode = 400;
      throw error;
    }

    // Split name into first and last name
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      const error = new Error(`Invalid student name format: ${name}. Please provide full name (first and last name)`);
      error.statusCode = 400;
      throw error;
    }

    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    // Find student by name, class, and grade
    const student = await Student.findOne({
      first_name: { $regex: new RegExp(`^${firstName}$`, "i") },
      last_name: { $regex: new RegExp(`^${lastName}$`, "i") },
      "class.class_name": { $regex: new RegExp(`^${className}$`, "i") },
      "grade.grade_name": { $regex: new RegExp(`^${gradeName}$`, "i") },
    })
      .populate("class.class_id")
      .populate("grade.grade_id");

    if (!student) {
      const error = new Error(
        `Student '${name}' not found in class ${className}, grade ${gradeName}`
      );
      error.statusCode = 404;
      throw error;
    }

    // Update student's phone numbers
    await Student.findByIdAndUpdate(student._id, {
      primary_number,
      secondary_number,
    });

    childInfoArray.push({
      student_id: student._id,
      name: `${student.first_name} ${student.last_name}`,
      roll_number: student.roll_number,
      class: {
        class_id: student.class.class_id,
        class_name: student.class.class_name,
      },
      grade: {
        grade_id: student.grade.grade_id,
        grade_name: student.grade.grade_name,
      },
    });
  }

  // Create parents
  const parents = await Parents.create({
    father_fname,
    father_lname,
    mother_fname,
    mother_lname,
    email,
    password: hashedPassword,
    primary_number,
    secondary_number,
    child_info: childInfoArray,
  });

  // Remove password from response
  const parentsObject = parents.toObject();
  delete parentsObject.password;

  return parentsObject;
};

const getAllParents = async () => {
  const parents = await Parents.find()
    .populate("child_info.student_id")
    .populate("child_info.class.class_id")
    .populate("child_info.grade.grade_id")
    .select("-password");
  return parents;
};

const getParentsById = async (id) => {
  const parents = await Parents.findById(id)
    .populate("child_info.student_id")
    .populate("child_info.class.class_id")
    .populate("child_info.grade.grade_id")
    .select("-password");
  if (!parents) {
    const error = new Error("Parents not found");
    error.statusCode = 404;
    throw error;
  }
  return parents;
};

const updateParents = async (id, parentsData) => {
  const { password, primary_number, secondary_number, ...restData } = parentsData;

  // Get current parents data to access child_info
  const currentParents = await Parents.findById(id);
  if (!currentParents) {
    const error = new Error("Parents not found");
    error.statusCode = 404;
    throw error;
  }

  // Hash password if provided
  if (password) {
    restData.password = await bcrypt.hash(password, 10);
  }

  // Add phone numbers to update data
  if (primary_number) {
    restData.primary_number = primary_number;
  }
  if (secondary_number !== undefined) {
    restData.secondary_number = secondary_number;
  }

  // Update phone numbers in all children's student records
  if (primary_number || secondary_number !== undefined) {
    const updateData = {};
    if (primary_number) updateData.primary_number = primary_number;
    if (secondary_number !== undefined) updateData.secondary_number = secondary_number;

    // Update all children
    for (const child of currentParents.child_info) {
      await Student.findByIdAndUpdate(child.student_id, updateData);
    }
  }

  const parents = await Parents.findByIdAndUpdate(id, restData, {
    new: true,
    runValidators: true,
  })
    .populate("child_info.student_id")
    .populate("child_info.class.class_id")
    .populate("child_info.grade.grade_id")
    .select("-password");

  if (!parents) {
    const error = new Error("Parents not found");
    error.statusCode = 404;
    throw error;
  }
  return parents;
};

const deleteParents = async (id) => {
  const parents = await Parents.findByIdAndDelete(id);
  if (!parents) {
    const error = new Error("Parents not found");
    error.statusCode = 404;
    throw error;
  }
  return parents;
};

const searchParents = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    // If no search term, return all parents
    return await Parents.find()
      .populate("child_info.student_id")
      .populate("child_info.class.class_id")
      .populate("child_info.grade.grade_id")
      .select("-password")
      .sort({ createdAt: -1 });
  }

  const trimmedSearch = searchTerm.trim();
  const searchParts = trimmedSearch.split(/\s+/);

  // Build query conditions
  const orConditions = [];

  // Single word search - search in all individual fields
  if (searchParts.length === 1) {
    const searchRegex = new RegExp(trimmedSearch, "i");
    orConditions.push(
      { father_fname: searchRegex },
      { father_lname: searchRegex },
      { mother_fname: searchRegex },
      { mother_lname: searchRegex },
      { email: searchRegex },
      { "child_info.name": searchRegex },
      { "child_info.roll_number": searchRegex }
    );
  }
  // Exactly 2 words - exact match for full names
  else if (searchParts.length === 2) {
    const firstName = searchParts[0];
    const lastName = searchParts[1];

    const firstRegex = new RegExp(`^${firstName}$`, "i");
    const lastRegex = new RegExp(`^${lastName}$`, "i");

    // Father full name (exact match)
    orConditions.push({
      $and: [{ father_fname: firstRegex }, { father_lname: lastRegex }],
    });

    // Mother full name (exact match)
    orConditions.push({
      $and: [{ mother_fname: firstRegex }, { mother_lname: lastRegex }],
    });

    // Child name (exact match)
    const fullName = `${firstName} ${lastName}`;
    orConditions.push({
      "child_info.name": { $regex: new RegExp(`^${fullName}$`, "i") },
    });
  }
  // More than 2 words - partial matches
  else if (searchParts.length > 2) {
    const firstName = searchParts[0];
    const lastName = searchParts.slice(1).join(" ");

    const firstRegex = new RegExp(firstName, "i");
    const lastRegex = new RegExp(lastName, "i");

    // Father full name
    orConditions.push({
      $and: [{ father_fname: firstRegex }, { father_lname: lastRegex }],
    });

    // Mother full name
    orConditions.push({
      $and: [{ mother_fname: firstRegex }, { mother_lname: lastRegex }],
    });
  }

  const parents = await Parents.find({ $or: orConditions })
    .populate("child_info.student_id")
    .populate("child_info.class.class_id")
    .populate("child_info.grade.grade_id")
    .select("-password")
    .sort({ createdAt: -1 });

  return parents;
};

module.exports = {
  registerParents,
  getAllParents,
  getParentsById,
  updateParents,
  deleteParents,
  searchParents,
};
