const testModel = require("../models/test.model");

const getAll = async () => {
  return await testModel.find();
};

const getById = async (id) => {
  return await testModel.findById(id);
};

const create = async (data) => {
  const newtest = new testModel(data);
  return await newtest.save();
};

const update = async (id, data) => {
  return await testModel.findByIdAndUpdate(id, data, { new: true });
};

const remove = async (id) => {
  return await testModel.findByIdAndDelete(id);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};