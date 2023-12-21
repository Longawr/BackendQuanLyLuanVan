const express = require('express');
const router = express.Router();

const { adminAuthenticated } = require('../middleware/authentication');

const StudentController = require('../app/controllers/StudentController');

// http://localhost:<port>/student

router.get('/search/:page', adminAuthenticated, StudentController.search);
router.get(
    '/details/:stdId',
    adminAuthenticated,
    StudentController.getStudentById
);
router.post('/add', adminAuthenticated, StudentController.add);
router.post('/add-many', adminAuthenticated, StudentController.addMany);
router.put('/update/:stdId', adminAuthenticated, StudentController.update);
router.delete('/remove', adminAuthenticated, StudentController.remove);

module.exports = router;
