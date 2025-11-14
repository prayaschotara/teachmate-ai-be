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

module.exports = {
  registerTeacher,
};
