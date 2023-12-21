const express = require('express');
const router = express.Router();

const { checkAuthenticated } = require('../middleware/authentication');

const invitationController = require('../app/controllers/InvitationController');

// http://localhost:<port>/invitation

router.get('/sent', checkAuthenticated, invitationController.getSentInvitation);
router.get(
    '/received',
    checkAuthenticated,
    invitationController.getReceivedInvitation
);
router.post('/add', checkAuthenticated, invitationController.addInvitation);
router.delete(
    '/remove/:invitationID',
    checkAuthenticated,
    invitationController.removeInvitation
);
router.post(
    '/accept/:invitationID',
    checkAuthenticated,
    invitationController.acceptInvitation
);

router.post(
    '/read/:invitationID',
    checkAuthenticated,
    invitationController.readReceivedInvitation
);

module.exports = router;
