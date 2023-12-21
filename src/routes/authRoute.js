const express = require('express');
const router = express.Router();

const {
    checkAuthenticated,
    checkNotAuthenticated,
} = require('../middleware/authentication');

const AuthController = require('../app/controllers/AuthController');

// http://localhost:<port>/auth

router.post('/login', checkNotAuthenticated, AuthController.loginPost);
router.get('/user', AuthController.getCurrentUser);
router.put('/user/update', AuthController.editCurrentUser);
router.get('/usersbyID/:groupID', AuthController.getUsersbyID);
router.post('/token', AuthController.token);
router.delete('/logout', AuthController.logout);

module.exports = router;
