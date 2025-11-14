const express = require('express');
const router = express.Router();
const contentCurationController = require('../controllers/contentCuration.controller');
const validateToken = require('../middlewares/auth-guard');

// All routes require authentication
// Curate content for lesson plan
router.post('/curate', validateToken, contentCurationController.curateContent);

module.exports = router;
