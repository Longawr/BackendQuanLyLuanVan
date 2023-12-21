if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const mongoose = require('mongoose');

const Group = require('../models/Group');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Invitation = require('../models/Invitation');

const { getActiveUser } = require('../../config/socket');

class GroupController {
    //[GET] /invitation/sent
    getSentInvitation = async (req, res) => {
        const causeby = req.user._id;

        try {
            const students = await Invitation.aggregate([
                { $match: { sentby: causeby, type: 'SV' } },
                {
                    $lookup: {
                        from: 'students',
                        as: 'sentto',
                        localField: 'sentto',
                        foreignField: '_id',
                    },
                },
                { $unwind: '$sentto' },
                {
                    $lookup: {
                        from: 'groups',
                        as: 'group',
                        localField: 'groupID',
                        foreignField: '_id',
                    },
                },
                { $unwind: '$group' },
                {
                    $project: {
                        groupID: 1,
                        groupName: '$group.name',
                        sentto: { _id: 1, name: 1, classname: 1 },
                        createdAt: 1,
                    },
                },
            ]);
            const teachers = await Invitation.aggregate([
                { $match: { sentby: causeby, type: 'GV' } },
                {
                    $lookup: {
                        from: 'teachers',
                        as: 'sentto',
                        localField: 'sentto',
                        foreignField: '_id',
                    },
                },
                { $unwind: '$sentto' },
                {
                    $lookup: {
                        from: 'groups',
                        as: 'group',
                        localField: 'groupID',
                        foreignField: '_id',
                    },
                },
                { $unwind: '$group' },
                {
                    $project: {
                        groupID: 1,
                        groupName: '$group.name',
                        sentto: { _id: 1, name: 1, classname: 1 },
                        createdAt: 1,
                    },
                },
            ]);
            let invitations = students.concat(teachers);
            invitations.sort((a, b) => b.createdAt - a.createdAt);

            return res.status(200).json(invitations);
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[GET] /invitation/received
    getReceivedInvitation = async (req, res) => {
        const causeby = req.user._id;

        try {
            const invitations = await Invitation.aggregate([
                { $match: { sentto: causeby } },
                {
                    $lookup: {
                        from: 'students',
                        as: 'sentby',
                        localField: 'sentby',
                        foreignField: '_id',
                    },
                },
                { $unwind: '$sentby' },
                {
                    $lookup: {
                        from: 'groups',
                        as: 'group',
                        localField: 'groupID',
                        foreignField: '_id',
                    },
                },
                { $unwind: '$group' },
                {
                    $project: {
                        groupID: 1,
                        groupName: '$group.name',
                        sentby: { _id: 1, name: 1, classname: 1 },
                        type: 1,
                        isSeen: 1,
                        createdAt: 1,
                    },
                },
            ]);

            return res.status(200).json(invitations);
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] /invitation/add | body = { groupID, userID, type }
    addInvitation = async (req, res) => {
        const leader = req.user._id;
        const io = req.app.io;
        let { groupID, userID, type } = req.body;
        let user, group;

        if (userID == leader)
            return res.status(500).json({
                name: 'WrongFieldError',
                message: 'can not invite yourself',
            });
        try {
            groupID = new mongoose.Types.ObjectId(groupID);

            const invite = await Invitation.exists({
                groupID,
                sentto: userID,
                type,
            });
            if (invite)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message: 'This user has been invited',
                });
            if (type == 'GV') {
                [user, group] = await Promise.all([
                    Teacher.findOne({ _id: userID }, '_id name').lean().exec(),
                    Group.findOne(
                        {
                            _id: groupID,
                            members: {
                                $elemMatch: {
                                    _id: leader,
                                    role: 'Leader',
                                },
                            },
                            teacherID: null,
                        },
                        '_id name'
                    )
                        .lean()
                        .exec(),
                ]);
            } else {
                [user, group] = await Promise.all([
                    Student.findOne({ _id: userID }, '_id name className')
                        .lean()
                        .exec(),
                    Group.findOne(
                        {
                            _id: groupID,
                            members: {
                                $elemMatch: {
                                    _id: leader,
                                    role: 'Leader',
                                },
                            },
                            'members._id': { $ne: userID },
                        },
                        '_id name'
                    )
                        .lean()
                        .exec(),
                ]);
            }
            if (user == null)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message: 'Invitation receiver was wrong',
                });

            if (group == null)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message:
                        'You must be leader to invite members, or this student was a member already, or groupID was wrong',
                });

            let invitation = new Invitation({
                groupID,
                sentby: leader,
                sentto: userID,
                type,
            });
            await invitation.save();

            invitation = invitation.toObject();
            delete invitation.updatedAt;
            delete invitation.__v;
            invitation.groupName = group.name;

            invitation.sentto = user;
            const socketID = getActiveUser(userID);
            if (socketID) {
                io.to(socketID).emit(
                    'receive-invitation',
                    invitation.toObject()
                );
            }
            return res.status(200).json(invitation);
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[DELETE] /invitation/remove/:invitationID
    removeInvitation = async (req, res) => {
        const io = req.app.io;
        const causeby = req.user._id;
        let invitationID = req.params.invitationID;
        try {
            // if a user rejects a received invitation then send the request WITHOUT the 'userID' variable
            // if leader remove a sent invitation then send the request WITH the 'userID' variable
            invitationID = new mongoose.Types.ObjectId(invitationID);

            const deletedInvitation = await Invitation.findOneAndDelete({
                _id: invitationID,
                $or: [{ sentto: causeby }, { sentby: causeby }],
            })
                .lean()
                .exec();

            if (deletedInvitation != null) {
                let userID, event;
                if (deletedInvitation.sentby != causeby) {
                    userID = deletedInvitation.sentby;
                    event = 'removed-sent-invitation';
                } else if (deletedInvitation.sentto != causeby) {
                    userID = deletedInvitation.sentto;
                    event = 'removed-received-invitation';
                }
                const socketId = getActiveUser(userID);
                if (socketId) {
                    io.to(socketId).emit(event, deletedInvitation._id);
                }
            }

            if (deletedInvitation == null)
                return res.status(500).json({
                    name: 'InvalidMemberError',
                    message:
                        'userID not in the group or userID being leader of the group',
                });

            return res
                .status(200)
                .json({ success: 'Remove invitation successfully' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] /invitation/accept/:invitationID
    acceptInvitation = async (req, res) => {
        const io = req.app.io;
        const causeby = req.user._id;
        let invitationID = req.params.invitationID;
        let updateResult;

        try {
            invitationID = new mongoose.Types.ObjectId(invitationID);

            const invitation = await Invitation.findOne({
                _id: invitationID,
                sentto: causeby,
            });
            if (invitation == null)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message: 'Invitation not found, groupID wrong or mising',
                });

            if (invitation.type == 'GV')
                updateResult = await Group.updateOne(
                    {
                        _id: invitation.groupID,
                        teacherID: { $ne: causeby },
                    },
                    { teacherID: causeby }
                );
            else
                updateResult = await Group.updateOne(
                    {
                        _id: invitation.groupID,
                        members: {
                            $not: {
                                $elemMatch: {
                                    _id: causeby,
                                    role: { $in: ['Leader', 'Member'] },
                                },
                            },
                        },
                    },
                    { $push: { members: { _id: causeby, role: 'Member' } } }
                );

            if (updateResult.matchedCount == 0)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message: 'Fail to find group or you are its member already',
                });

            await invitation.deleteOne();
            const socketId = getActiveUser(invitation.sentby);
            if (socketId) {
                io.to(socketId).emit('accepted-invitation', invitation._id);
            }

            return res.status(200).json({ success: 'Join group successfully' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] /invitation/read/:invitationID
    readReceivedInvitation = async (req, res) => {
        const invID = req.params.invitationID;
        try {
            const updateRes = await Invitation.updateOne(
                { _id: invID },
                { isSeen: true }
            );
            if (updateRes.modifiedCount > 0) return res.status(200).end();
            return res.status(500).json({
                name: 'UpdateFailError',
                message: 'Something is wrong',
            });
        } catch (error) {
            return res.status(500).json(error);
        }
    };
}

module.exports = new GroupController();
