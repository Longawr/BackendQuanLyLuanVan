if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const bcrypt = require('bcrypt');

const JwtController = require('../utils/JwtController');
const Account = require('../models/Account');
const Group = require('../models/Group');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Invitation = require('../models/Invitation');

class AuthController {
    //[POST] /auth/login
    loginPost = async (req, res) => {
        const { id, password } = req.body;

        if (!id || !password) {
            return res.status(500).json({
                name: 'FieldMissingError',
                message: 'Please fill all required fields',
            });
        }

        try {
            const account = await Account.findOne({ username: id })
                .lean()
                .exec();
            if (account == null) {
                return res.status(500).json({
                    name: 'loginError',
                    message: 'ID is not registered',
                });
            }

            if (!(await bcrypt.compare(password, account.hashedPassword))) {
                return res.status(500).json({
                    name: 'PasswordError',
                    message: 'Password is incorrect',
                });
            }

            const { accessExpiresTime } = await JwtController.tokenHandler(
                account.username,
                res
            );
            return res
                .status(200)
                .json({ expiredAt: accessExpiresTime, role: account.role });
        } catch (error) {
            console.error(error);
            res.status(500).json(error);
        }
    };

    //[POST] /auth/token
    token = async (req, res) => {
        try {
            let { accessExpiresTime, role, error } =
                await JwtController.refreshToken(req, res);

            if (error) return res.status(500).json(error);
            return res
                .status(200)
                .json({ expiredAt: accessExpiresTime, role: role });
        } catch (error) {
            console.error(error);
            res.status(500).json(error);
        }
    };

    //[DELETE] /auth/logout
    logout = async (req, res) => {
        try {
            const { error } = await JwtController.clearRefreshToken(req, res);

            if (error) return res.status(200).json(error);
            return res.status(200).end();
        } catch (error) {
            console.error(error);
            return res.status(200).json(error);
        }
    };

    //[GET] /auth/user
    getCurrentUser = async (req, res) => {
        try {
            let { user, error } = await JwtController.checkAuthenticated(
                req,
                res
            );

            if (error) return res.status(401).json(error);
            return res.status(200).json({ ...user });
        } catch (error) {
            console.error(error);
            res.status(500).json(error);
        }
    };

    //[PUT] /auth/user/edit
    editCurrentUser = async (req, res) => {
        const user = req.body;
        let data;

        if (!user)
            return res.status(403).json({
                name: 'WrongFieldError',
                message: 'Missing Field',
            });

        try {
            let { user: causeby, error } =
                await JwtController.checkAuthenticated(req, res);

            if (error) return res.status(500).json(error);
            if (causeby.role === 'SV') {
                data = await Student.findByIdAndUpdate(causeby._id, user)
                    .lean()
                    .exec();
            } else if (causeby.role === 'GV' || causeby.role === 'ADMIN') {
                data = await Teacher.findByIdAndUpdate(causeby._id, user)
                    .lean()
                    .exec();
            }

            if (!data)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message: 'user not found',
                });

            return res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json(error);
        }
    };

    //[GET] /auth/usersbyID/:groupID?id={value}
    getUsersbyID = async (req, res) => {
        const searchText = req.query.id;
        const groupID = req.params.groupID;
        let GVs = [];

        if (!searchText || !groupID)
            return res.status(403).json({
                name: 'WrongFieldError',
                message: 'Missing Field',
            });

        let match = {
            $or: [
                { _id: { $regex: '.*' + searchText + '.*', $options: 'i' } },
                { name: { $regex: '.*' + searchText + '.*', $options: 'i' } },
            ],
        };

        try {
            const [group, invitation] = await Promise.all([
                Group.findOne({ _id: groupID }, 'members._id teacherID')
                    .lean()
                    .exec(),
                Invitation.find({ groupID }, { _id: '$sentto' }).lean().exec(),
            ]);
            if (!group)
                return res.status(500).json({
                    name: 'WrongFieldError',
                    message: 'GroupID not right',
                });
            match._id = { $nin: [...group.members, ...invitation] };
            const SVs = await Student.find(match, '_id name')
                .limit(5)
                .lean()
                .exec();
            SVs.forEach((sv) => (sv.role = 'SV'));
            if (group.teacherID == null) {
                GVs = await Teacher.find(match, '_id name')
                    .limit(5)
                    .lean()
                    .exec();
                GVs.forEach((gv) => (gv.role = 'GV'));
            }
            const users = [...SVs, ...GVs].sort((a, b) =>
                a._id.localeCompare(b._id)
            );

            return res.status(200).json(users);
        } catch (error) {
            console.error(error);
            res.status(500).json(error);
        }
    };

    //[GET] /auth/get-cookies
    getCookies = (req, res, next) => {
        res.json({ cookies: req.cookies });
    };

    //[POST] /auth/set-cookies?key={key}&value={value}
    setCookies = (req, res, next) => {
        let key = req.query.key;
        let value = req.query.value;

        res.cookie(key, value); //
        res.end();
    };

    //[DELETE] /auth/remove-cookie?key={key}
    removeCookies = (req, res, next) => {
        let key = req.query.key;
        res.clearCookie(key);
        res.end();
    };
}

module.exports = new AuthController();
