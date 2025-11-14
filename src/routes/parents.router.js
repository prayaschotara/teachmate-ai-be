const express = require("express");
const router = express.Router();
const {
  registerParents,
  getAllParents,
  getParentsById,
  updateParents,
  deleteParents,
  searchParents,
} = require("../controllers/parents.controller");

router.post("/register", registerParents);
router.get("/", getAllParents);
router.get("/search", searchParents);
router.get("/:id", getParentsById);
router.put("/:id", updateParents);
router.delete("/:id", deleteParents);

module.exports = router;
