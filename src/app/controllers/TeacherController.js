if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const bcrypt = require('bcrypt');

const Account = require('../models/Account');
const Index = require('../models/Index');
const Teacher = require('../models/Teacher');

/*
 ** expect: input: Date date (e.g.: 'Sun Sep 24 2023 16:31:34 GMT+0700 (Indochina Time)')
 **         output: ddmmyyyy (e.g.: '24092023')
 */
function cvDateToString(date, locale = 'vn') {
    let d = date;
    if (!(date instanceof Date)) d = new Date(date);
    if (d == 'Invalid Date') return d;

    let dd = String(d.getDate()).padStart(2, '0'),
        mm = String(d.getMonth() + 1).padStart(2, '0'), //January is 0!
        yyyy = d.getFullYear();

    switch (locale) {
        case 'vn':
            return [dd, mm, yyyy].join('');

        case 'en':
            return [mm, dd, yyyy].join('');
        default:
            return [yyyy, mm, dd].join('');
    }
}

class TeacherController {
    //[GET] /teacher/search/:page?searchText={value}&pageSize={value}
    search = async (req, res) => {
        const page = parseInt(req.params.page);
        const searchText = req.query.searchText;
        const pageSize = parseInt(req.query.pageSize);

        const match = {
            $or: [
                {
                    _id: {
                        $regex: '.*' + searchText + '.*',
                        $options: 'i',
                    },
                },
                {
                    name: {
                        $regex: '.*' + searchText + '.*',
                        $options: 'i',
                    },
                },
            ],
        };

        try {
            const tchQuery = Teacher.find(
                match,
                '_id name birthday major email phone'
            )
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean()
                .exec();

            const totalQuery = Teacher.countDocuments(match);
            const [tch, total] = await Promise.all([tchQuery, totalQuery]);

            return res.status(200).json({
                items: tch,
                total,
                page: page,
                pageSize: pageSize,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[GET] /teacher/details/:tchId
    getTeacherById = async (req, res) => {
        const tchId = req.params.tchId;

        try {
            const teacher = await Teacher.findById(
                tchId,
                '_id name birthday major email phone'
            )
                .lean()
                .exec();
            return res.status(200).json(teacher);
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    // password: birthday+major, e.g.: '24092023CNTT'
    //[POST] /teacher/add
    add = async (req, res) => {
        const yearInShort = new Date().getFullYear().toString().slice(2, 4);
        let _id = '';
        let password = '';
        let { name, birthday, major, email, phone } = req.body;

        if (name == null || major == null)
            return res.status(500).json({
                name: 'MissingFieldError',
                message: 'name and major is required',
            });

        try {
            let increment = await Index.findOne({ name: 'GV' }, 'value').exec();
            if (increment == null)
                increment = new Index({ name: 'GV', value: 1 });
            _id =
                'GV' + yearInShort + String(increment.value++).padStart(4, '0');

            let tch = new Teacher({
                _id,
                name,
                birthday,
                major,
                email,
                phone,
            });
            password = cvDateToString(tch.birthday) + tch.major;

            //salt rounds = 10
            const hashedPassword = await bcrypt.hash(password, 10);
            //GV is default in this case\
            let acc = new Account({
                username: _id,
                hashedPassword,
                role: 'GV',
            });
            await tch.save();
            await acc.save();
            await increment.save();

            return res.status(200).json({ success: _id + ' created' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] /teacher/add-many
    addMany = async (req, res) => {
        // body = { TeacherArray: [{ name, birthday, major, email, phone, address }] } // array of Teacher
        let accArray = [];
        let password = '';
        let hashedPassword = '';
        const yearInShort = new Date().getFullYear().toString().slice(2, 4);
        let { teacherArray } = req.body;

        if (!Array.isArray(teacherArray) || teacherArray.length === 0)
            return res.status(500).json({
                name: 'FieldMissingError',
                message: 'Your array is empty',
            });

        try {
            let increment = await Index.findOne({ name: 'GV' }, 'value').exec();
            if (increment == null)
                increment = new Index({ name: 'GV', value: 1 });

            //GV is default in this case
            for (const Teacher of teacherArray) {
                Teacher._id =
                    'GV' +
                    yearInShort +
                    String(increment.value++).padStart(4, '0');
                if (Teacher.birthday == null) Teacher.birthday = new Date();
                if (Teacher.major == null) Teacher.major = 'XXXX';

                //salt = 10
                password = cvDateToString(Teacher.birthday) + Teacher.major;
                hashedPassword = await bcrypt.hash(password, 10);

                accArray.push({
                    username: Teacher._id,
                    hashedPassword,
                    role: 'GV',
                });
            }

            await Promise.all([
                Teacher.create(teacherArray),
                Account.create(accArray),
                increment.save(),
            ]);

            return res
                .status(200)
                .json({ success: 'Create Teacher successfully' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[PUT] /teacher/update/:tchId
    update = async (req, res) => {
        const tchId = req.params.tchId;
        const user = req.body;

        // these fields are required
        if (!(user.name || user.major || tchId))
            return res.status(500).json({
                name: 'MissingFieldError',
                message: 'tchId, name, major is required',
            });

        try {
            const tch = await Teacher.updateOne({ _id: tchId }, user).exec();
            if (tch.matchedCount == 0)
                return res.status(500).json({
                    name: 'TeacherNotFound',
                    message: 'Not found teacher with id ' + tchId,
                });

            if (tch.modifiedCount == 0)
                return res.status(500).json({
                    name: 'SomeFieldsInvalid',
                    message:
                        'can not update data because some fields are invalid',
                });

            return res.status(200).json({ success: tchId + ' updated' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[DELETE] /teacher/remove
    remove = async (req, res) => {
        const ids = req.body;

        // these fields are required
        if (!Array.isArray(ids) || ids.length === 0)
            return res.status(500).json({
                name: 'MissingFieldError',
                message: 'ids parameter is missing',
            });

        try {
            const tch = await Teacher.deleteOne({ _id: { $in: ids } }).exec();
            if (tch.deletedCount == 0)
                return res.status(500).json({
                    name: 'TeacherNotFound',
                    message: 'No teacher deleted',
                });

            return res
                .status(200)
                .json({ success: tch.deletedCount + ' teacher deleted' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };
}

module.exports = new TeacherController();
