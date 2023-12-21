const express = require('express');
const router = express.Router();

const {
    checkAuthenticated,
    adminAuthenticated,
} = require('../middleware/authentication');

const AccountController = require('../app/controllers/AccountController');

// http://localhost:<port>/account

router.get('/show', adminAuthenticated, AccountController.show);
router.post('/add', adminAuthenticated, AccountController.add);
router.post('/add-many', adminAuthenticated, AccountController.addMany);
router.post('/remove', adminAuthenticated, AccountController.remove);
router.post('/remove-many', adminAuthenticated, AccountController.removeMany);

module.exports = router;
