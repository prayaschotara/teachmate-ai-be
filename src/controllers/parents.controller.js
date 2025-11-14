const parentsService = require("../services/parents.service");

const registerParents = async (req, res, next) => {
  try {
    const parents = await parentsService.registerParents(req.body);
    res.status(201).json({
      success: true,
      message: "Parents registered successfully",
      data: parents,
    });
  } catch (error) {
    next(error);
  }
};

const getAllParents = async (req, res, next) => {
  try {
    const parents = await parentsService.getAllParents();
    res.status(200).json({
      success: true,
      data: parents,
    });
  } catch (error) {
    next(error);
  }
};

const getParentsById = async (req, res, next) => {
  try {
    const parents = await parentsService.getParentsById(req.params.id);
    res.status(200).json({
      success: true,
      data: parents,
    });
  } catch (error) {
    next(error);
  }
};

const updateParents = async (req, res, next) => {
  try {
    const parents = await parentsService.updateParents(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Parents updated successfully",
      data: parents,
    });
  } catch (error) {
    next(error);
  }
};

const deleteParents = async (req, res, next) => {
  try {
    await parentsService.deleteParents(req.params.id);
    res.status(200).json({
      success: true,
      message: "Parents deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const searchParents = async (req, res, next) => {
  try {
    const { q } = req.query;
    const parents = await parentsService.searchParents(q);
    res.status(200).json({
      success: true,
      count: parents.length,
      data: parents,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerParents,
  getAllParents,
  getParentsById,
  updateParents,
  deleteParents,
  searchParents,
};
