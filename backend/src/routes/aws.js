const express    = require('express');
const router     = express.Router();
const { saveCredentials, getResources } = require('../controllers/awsController');

router.post('/credentials', saveCredentials);
router.get('/resources',    getResources);

module.exports = router;