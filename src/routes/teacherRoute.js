const express = require('express');
const router = express.Router();

const { adminAuthenticated } = require('../middleware/authentication');

const TeacherController = require('../app/controllers/TeacherController');

// http://localhost:<port>/teacher

router.get('/search/:page', adminAuthenticated, TeacherController.search);
router.get(
    '/details/:tchId',
    adminAuthenticated,
    TeacherController.getTeacherById
);
router.post('/add', adminAuthenticated, TeacherController.add);
router.post('/add-many', adminAuthenticated, TeacherController.addMany);
router.put('/update/:tchId', adminAuthenticated, TeacherController.update);
router.delete('/remove', adminAuthenticated, TeacherController.remove);

module.exports = router;
