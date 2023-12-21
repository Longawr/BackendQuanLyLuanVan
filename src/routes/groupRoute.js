const express = require('express');
const router = express.Router();

const { checkAuthenticated } = require('../middleware/authentication');
const uploads = require('../middleware/uploads');
const GroupController = require('../app/controllers/GroupController');

// http://localhost:<port>/group

router.get('/show/:page', checkAuthenticated, GroupController.show);
router.get(
    '/details/:groupID',
    checkAuthenticated,
    GroupController.getGroupDetails
);
router.post('/add', checkAuthenticated, GroupController.add);
router.put('/update', checkAuthenticated, GroupController.update);
router.delete('/remove/', checkAuthenticated, GroupController.remove);

router.delete(
    '/details/:groupID/members/remove',
    checkAuthenticated,
    GroupController.removeMember
);

router.post(
    '/details/:groupID/file/upload/',
    [checkAuthenticated, uploads.single('file')],
    GroupController.upload
);
router.get(
    '/details/:groupID/file/:fileID',
    checkAuthenticated,
    GroupController.download
);
router.delete(
    '/details/:groupID/file/remove',
    checkAuthenticated,
    GroupController.removeFiles
);

module.exports = router;
