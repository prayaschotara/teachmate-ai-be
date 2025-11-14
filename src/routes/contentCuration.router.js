const express = require('express');
const router = express.Router();
const contentCurationController = require('../controllers/contentCuration.controller');

// Curate content for lesson plan
router.post('/curate', contentCurationController.curateContent);

module.exports = router;
