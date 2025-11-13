const controllerTemplate = `const responseHelper = require("../helpers/http-responses");

const {getAll, getById, create, update, remove} = require("../services/<resourcename>.service");

module.exports = {
  GetAll: async (req, res, next) => {
    try {
      responseHelper.success(res, "Success", null);
    } catch (error) {
      next(error); 
    }
  },
  
  GetById: async (req, res, next) => {
    try {
      const id = req.params.id;
      responseHelper.success(res, "Success", null);
    } catch (error) {
      next(error);
    }
  },

  Create: async (req, res, next) => {
    try {
      responseHelper.created(res, "Created successfully", null);
    } catch (error) {
      next(error);
    }
  },

  Update: async (req, res, next) => {
    try {
      const id = req.params.id;
      responseHelper.success(res, "Updated successfully", null);
    } catch (error) {
      next(error);
    }
  },

  Delete: async (req, res, next) => {
    try {
      const id = req.params.id;
      responseHelper.success(res, "Deleted successfully", null);
    } catch (error) {
      next(error);
    }
  }
};`;

// Create service template
const serviceTemplate = `const <resourcename>Model = require("../models/<resourcename>.model");

const getAll = async () => {
  return await <resourcename>Model.find();
};

const getById = async (id) => {
  return await <resourcename>Model.findById(id);
};

const create = async (data) => {
  const new<resourcename> = new <resourcename>Model(data);
  return await new<resourcename>.save();
};

const update = async (id, data) => {
  return await <resourcename>Model.findByIdAndUpdate(id, data, { new: true });
};

const remove = async (id) => {
  return await <resourcename>Model.findByIdAndDelete(id);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};`;

// Create router template
const routerTemplate = `const express = require("express");
const router = express.Router();
const {GetAll,GetById,Create, Update, Delete} = require("../controllers/<resourcename>.controller");

router.get("/", GetAll);
router.get("/:id", GetById);
router.post("/", Create);
router.put("/:id", Update);
router.delete("/:id", Delete);

module.exports = router;`;

const schemaTemplate = `const mongoose = require("mongoose");

const <resourcename>Schema = new mongoose.Schema({
  // Define your schema fields here
});

module.exports = <resourcename>Schema;`;

const modelTemplate = `const mongoose = require("mongoose");
const <resourcename>Schema = require("../schemas/<resourcename>.schema");

const <resourcename>Model = mongoose.model("<resourcename>", <resourcename>Schema);

module.exports = <resourcename>Model;`;

module.exports = {
  controllerTemplate,
  serviceTemplate,
  routerTemplate,
  schemaTemplate,
  modelTemplate,
};
