if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const mongoose = require('mongoose');

const Group = require('../models/Group');
const MeganzController = require('../utils/MeganzController');
const { checkForPlagiarism } = require('../utils/PlagiarismCheck');
const { getActiveUser } = require('../../config/socket');

class GroupController {
    //[GET] /group/show/:page?name={value}&pageSize={value}
    show = async (req, res) => {
        const causeby = req.user._id;
        const page = parseInt(req.params.page);
        const pageSize = parseInt(req.query.pageSize);
        const name = req.query.name;

        let match = {
            $or: [{ 'members._id': causeby }, { teacherID: causeby }],
        };
        if (name) match.name = { $regex: '.*' + name + '.*', $options: 'i' };

        try {
            const seachPromise = Group.aggregate([
                {
                    $match: match,
                },
                {
                    $unwind: {
                        path: '$members',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                { $match: { 'members.role': 'Leader' } },
                {
                    $lookup: {
                        from: 'students',
                        as: 'leader',
                        localField: 'members._id',
                        foreignField: '_id',
                    },
                },
                {
                    $unwind: {
                        path: '$leader',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'teachers',
                        as: 'teacher',
                        localField: 'teacherID',
                        foreignField: '_id',
                    },
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        leader: { _id: 1, name: 1 },
                        teacher: { _id: 1, name: 1 },
                    },
                },
                { $skip: (page - 1) * pageSize },
                { $limit: pageSize },
            ]);

            const totalPromise = Group.countDocuments(match);
            const [groups, total] = await Promise.all([
                seachPromise,
                totalPromise,
            ]);

            return res.status(200).json({
                items: groups,
                total: total,
                page: page,
                pageSize: pageSize,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[GET] /group/details/:groupID
    getGroupDetails = async (req, res) => {
        const causeby = req.user._id;
        let groupID = req.params.groupID;

        try {
            groupID = new mongoose.Types.ObjectId(groupID);
            const group = await Group.aggregate([
                {
                    $match: {
                        _id: groupID,
                        $or: [
                            { 'members._id': causeby },
                            { teacherID: causeby },
                        ],
                    },
                },
                {
                    $unwind: {
                        path: '$members',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'students',
                        as: 'student',
                        localField: 'members._id',
                        foreignField: '_id',
                    },
                },
                {
                    $unwind: {
                        path: '$student',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: 'teachers',
                        as: 'teacher',
                        localField: 'teacherID',
                        foreignField: '_id',
                    },
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        projectName: 1,
                        files: 1,
                        student: { _id: 1, name: 1, role: '$members.role' },
                        teacher: { _id: 1, name: 1 },
                    },
                },
                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$name' },
                        projectName: { $first: '$projectName' },
                        files: { $first: '$files' },
                        teacher: { $first: '$teacher' },
                        members: {
                            $push: '$student',
                        },
                    },
                },
            ]);

            if (group.length === 1) {
                return res.status(200).json(group[0]);
            }
            return res.status(500).json({
                name: 'WrongFieldError',
                message: 'could not find group with that id',
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] /group/add/
    add = async (req, res) => {
        const leader = req.user._id;
        const { groupName } = req.body;

        const group = new Group({
            name: groupName,
            members: [{ _id: leader, role: 'Leader' }],
        });

        try {
            await group.save();
            return res
                .status(200)
                .json({ success: 'Create group successfully' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[DELETE] /group/:groupID/members/remove/
    removeMember = async (req, res) => {
        const causeby = req.user._id;
        const role = req.user.role;
        const io = req.app.io;
        const memberIDs = req.body.memberIDs;
        let groupID = req.params.groupID;
        let group;
        if (!Array.isArray(memberIDs))
            return res.status(500).json({
                name: 'WrongFieldError',
                message: 'memberIDs must be an array',
            });
        try {
            groupID = new mongoose.Types.ObjectId(groupID);
            // memberIDs must be an array, just send an empty array if want to leave the group
            if (
                memberIDs.length > 1 ||
                (memberIDs.length === 1 && memberIDs[0] !== causeby)
            ) {
                group = await Group.findOneAndUpdate(
                    {
                        _id: groupID,
                        members: {
                            $elemMatch: {
                                _id: causeby,
                                role: 'Leader',
                            },
                        },
                    },
                    {
                        $pull: {
                            members: {
                                _id: { $in: memberIDs },
                                role: 'Member',
                            },
                        },
                    }
                )
                    .lean()
                    .exec();
                let data = { groupName: group.name, by: req.user.name };
                if (group != null) {
                    memberIDs.forEach((memberID) => {
                        const socketId = getActiveUser(memberID);
                        if (socketId) {
                            io.to(socketId).emit('removed-member', data);
                        }
                    });
                }
            } else if (role === 'SV') {
                group = await Group.findOneAndUpdate(
                    {
                        _id: groupID,
                        members: {
                            $not: {
                                $elemMatch: {
                                    _id: causeby,
                                    role: 'Leader',
                                },
                            },
                        },
                    },
                    {
                        $pull: {
                            members: {
                                _id: causeby,
                                role: 'Member',
                            },
                        },
                    }
                )
                    .lean()
                    .exec();
            } else if (role === 'GV') {
                group = await Group.findOneAndUpdate(
                    {
                        _id: groupID,
                        teacherID: causeby,
                    },
                    {
                        $unset: { teacherID: '' },
                    }
                )
                    .lean()
                    .exec();
            }

            if (group == null)
                return res.status(500).json({
                    name: 'InvalidInputError',
                    message:
                        'Wrong groupID or wrong memberIDs or you are not allowed to remove members of this group',
                });
            return res
                .status(200)
                .json({ success: 'Remove member successfully' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[PUT] /group/update
    update = async (req, res) => {
        const leader = req.user._id;
        let { groupID, groupName, projectName } = req.body;
        let set = {};
        groupName = groupName?.trim() || undefined;
        projectName = projectName?.trim() || undefined;

        if (!groupName && !projectName)
            return res.status(500).json({
                name: 'MissingFieldError',
                message: 'you must provide field',
            });
        if (groupName) {
            set.name = groupName;
        }
        if (projectName) {
            set.projectName = projectName;
        }
        try {
            groupID = new mongoose.Types.ObjectId(groupID);

            const group = await Group.updateOne(
                {
                    _id: groupID,
                    members: { $elemMatch: { _id: leader, role: 'Leader' } },
                },
                set
            );

            if (group.matchedCount === 0)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message: 'Group not found, check group ID',
                });
            if (group.modifiedCount === 0)
                return res.status(500).json({
                    name: 'ValidationError',
                    message: 'Group name is incorrect',
                });

            return res.status(200).end();
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[DELETE] /group/remove/
    remove = async (req, res) => {
        const causeby = req.user._id;
        const io = req.app.io;
        let groupIDs = req.body.groupIDs;
        if (!Array.isArray(groupIDs) || groupIDs.length === 0)
            return res.status(500).json({
                name: 'WrongFieldError',
                message: 'Please enter an array in groupIDs field',
            });
        try {
            groupIDs = groupIDs.map(
                (groupID) => new mongoose.Types.ObjectId(groupID)
            );
            const groups = await Group.find({
                _id: { $in: groupIDs },
                members: {
                    $elemMatch: {
                        _id: causeby,
                        role: 'Leader',
                    },
                },
            })
                .lean()
                .exec();

            if (groups.length === 0)
                return res.status(500).json({
                    name: 'InvalidInputError',
                    message: 'Wrong groupID or you must be leader of the group',
                });
            const deleteResponse = await Group.deleteMany({
                _id: { $in: groupIDs },
                members: {
                    $elemMatch: {
                        _id: causeby,
                        role: 'Leader',
                    },
                },
            });
            if (deleteResponse.deletedCount === 0)
                return res.status(500).json({
                    name: 'InternalServerError',
                    message: 'Something went wrong',
                });
            res.status(200).json({ success: 'Remove group successfully' });

            groups.map((group) => {
                let socketId = getActiveUser(group.teacherID);
                const data = { groupName: group.name, by: req.user.name };
                if (socketId) {
                    io.to(socketId).emit('removed-group', data);
                }

                for (let i = 0; i < group.members.length; i++) {
                    if (group.members[i].role === 'Member') {
                        socketId = getActiveUser(group.members[i]._id);
                        if (socketId) {
                            io.to(socketId).emit('removed-group', data);
                        }
                    }
                }
            });
            return;
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] group/details/:groupID/file/upload
    upload = async (req, res) => {
        const causeby = req.user._id;
        const groupFolder = req.params.groupID;
        const file = req.file;
        let group;

        if (file == null)
            return res.status(400).json({
                name: 'MissingFieldError',
                message: 'You send no file',
            });

        try {
            const response = await MeganzController.uploadFile(
                file.buffer,
                file.originalname,
                groupFolder
            );
            if (response.error) return res.status(500).json(response.error);

            const groupID = new mongoose.Types.ObjectId(groupFolder);
            group = await Group.updateOne(
                {
                    _id: groupID,
                    members: { $elemMatch: { _id: causeby, role: 'Leader' } },
                    'files.originalname': { $ne: file.originalname },
                },
                {
                    $push: { files: file },
                }
            );

            if (group.matchedCount === 0) {
                res.status(500).json({
                    name: 'WrongFieldError',
                    message:
                        'groupID is not right or you are not its leader, or filename existed already',
                });
                await MeganzController.removeFiles(
                    file.originalname,
                    groupFolder
                );
                return;
            }
            res.status(200).json('success upload files');

            const data = await checkForPlagiarism(file.buffer, file.mimetype);
            console.log(data);
            await Group.updateOne(
                {
                    _id: groupID,
                    members: {
                        $elemMatch: {
                            _id: causeby,
                            role: 'Leader',
                        },
                    },
                    'files.originalname': file.originalname,
                },
                {
                    $set: {
                        'files.$.percentPlagiarism': data.percentPlagiarism,
                        'files.$.sources': data.sources,
                    },
                }
            );
        } catch (error) {
            const { name, message, stack } = error;
            console.error({ name, message, stack });
            if (res.headersSent) return;
            return res.status(500).json(error);
        }
    };

    //[GET] group/:groupID/file/:fileID
    download = async (req, res) => {
        const causeby = req.user._id;
        let { groupID: folder, fileID } = req.params;

        try {
            let groupID = new mongoose.Types.ObjectId(folder);

            const group = await Group.findOne(
                {
                    _id: groupID,
                    $or: [{ 'members._id': causeby }, { teacherID: causeby }],
                    'files._id': fileID,
                },
                'files.$'
            )
                .lean()
                .exec();

            if (group == null) {
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message:
                        'groupID is not right or there is no file with that name',
                });
            }

            const filename = group.files[0].originalname;
            const mimetype = group.files[0].mimetype;
            const stream = await MeganzController.downloadFile(
                filename,
                folder
            );
            const disposition = `attachment; filename=${filename}`;
            res.status(206)
                .setHeader('Content-Type', mimetype)
                .setHeader('Content-Disposition', disposition);
            stream.on('error', (error) => console.error(error));
            return stream.pipe(res);
        } catch (error) {
            const { name, message, stack } = error;
            console.error({ name, message, stack });
            return res.status(500).json(error);
        }
    };

    //[DELETE]group/:groupID/file/remove
    removeFiles = async (req, res) => {
        const causeby = req.user._id;
        const { fileIDs } = req.body;
        const folder = req.params.groupID;
        if (fileIDs == null)
            return res.status(500).json({
                name: 'WrongFieldError',
                message:
                    'Bad request. One or several required parameters are missing.',
            });

        try {
            let groupID = new mongoose.Types.ObjectId(folder);

            const group = await Group.findOneAndUpdate(
                {
                    _id: groupID,
                    members: {
                        $elemMatch: {
                            _id: causeby,
                            role: 'Leader',
                        },
                    },
                    'files._id': { $in: fileIDs },
                },
                {
                    $pull: { files: { _id: { $in: fileIDs } } },
                },
                { 'files.$': 1 }
            )
                .lean()
                .exec();
            if (group == null)
                return res.status(500).json({
                    name: 'InvalidInputError',
                    message:
                        'Wrong groupID or fileID, or you must be leader of the group',
                });
            const files = group.files.map((file) => file.originalname);

            await MeganzController.removeFiles(files, folder);
            return res.status(200).end();
        } catch ({ name, message, stack }) {
            console.error({ name, message, stack });
            return res.status(500).json({ name, message, stack });
        }
    };
}

module.exports = new GroupController();
