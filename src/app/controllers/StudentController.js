if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const bcrypt = require('bcrypt');

const Account = require('../models/Account');
const Index = require('../models/Index');
const Student = require('../models/Student');

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

class StudentController {
    //[GET] /student/search/:page?searchText={value}&pageSize={value}
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
            const stdQuery = Student.find(
                match,
                '_id name birthday major className email phone'
            )
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean()
                .exec();

            const totalQuery = Student.countDocuments(match);
            const [std, total] = await Promise.all([stdQuery, totalQuery]);

            return res.status(200).json({
                items: std,
                total,
                page: page,
                pageSize: pageSize,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[GET] /student/details/:stdId
    getStudentById = async (req, res) => {
        const stdId = req.params.stdId;

        try {
            const student = await Student.findById(
                stdId,
                '_id name birthday major className email phone'
            )
                .lean()
                .exec();
            return res.status(200).json(student);
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    // password: birthday+major, e.g.: '09102023CNTT'
    //[POST] /student/add
    add = async (req, res) => {
        const yearInShort = new Date().getFullYear().toString().slice(2, 4);
        let _id = '';
        let password = '';
        let { name, birthday, major, className, email, phone } = req.body;

        if (name == null || major == null)
            return res.status(500).json({
                name: 'MissingFieldError',
                message: 'name and major is required',
            });

        try {
            let increment = await Index.findOne({ name: 'SV' }, 'value').exec();
            if (increment == null)
                increment = new Index({ name: 'SV', value: 1 });
            _id =
                'SV' + yearInShort + String(increment.value++).padStart(4, '0');

            let std = new Student({
                _id,
                name,
                birthday,
                major,
                className,
                email,
                phone,
            });
            password = cvDateToString(std.birthday) + std.major;

            //salt rounds = 10
            const hashedPassword = await bcrypt.hash(password, 10);
            //SV is default in this case\
            let acc = new Account({
                username: _id,
                hashedPassword,
                role: 'SV',
            });
            await std.save();
            await acc.save();
            await increment.save();

            return res.status(200).json({ success: _id + ' created' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] /student/add-many
    addMany = async (req, res) => {
        // body = { StudentArray: [{ name, birthday, major, email, phone, address }] } // array of Student
        let accArray = [];
        let password = '';
        let hashedPassword = '';
        const yearInShort = new Date().getFullYear().toString().slice(2, 4);
        let { studentArray } = req.body;

        if (!Array.isArray(studentArray) || studentArray.length === 0)
            return res.status(500).json({
                name: 'FieldMissingError',
                message: 'Your array is empty',
            });

        try {
            let increment = await Index.findOne({ name: 'SV' }, 'value').exec();
            if (increment == null)
                increment = new Index({ name: 'SV', value: 1 });

            //SV is default in this case
            for (const Student of studentArray) {
                Student._id =
                    'SV' +
                    yearInShort +
                    String(increment.value++).padStart(4, '0');
                if (Student.birthday == null) Student.birthday = new Date();
                if (Student.major == null) Student.major = 'XXXX';

                //salt = 10
                password = cvDateToString(Student.birthday) + Student.major;
                hashedPassword = await bcrypt.hash(password, 10);

                accArray.push({
                    username: Student._id,
                    hashedPassword,
                    role: 'SV',
                });
            }

            await Promise.all([
                Student.create(studentArray),
                Account.create(accArray),
                increment.save(),
            ]);

            return res
                .status(200)
                .json({ success: 'Create Student successfully' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[PUT] /student/update/:stdId
    update = async (req, res) => {
        const stdId = req.params.stdId;
        const user = req.body;

        // these fields are required
        if (!(user.name || user.major || stdId))
            return res.status(500).json({
                name: 'MissingFieldError',
                message: 'stdId, name, major is required',
            });

        try {
            const std = await Student.updateOne({ _id: stdId }, user).exec();
            if (std.matchedCount == 0)
                return res.status(500).json({
                    name: 'StudentNotFound',
                    message: 'Not found student with id ' + stdId,
                });

            if (std.modifiedCount == 0)
                return res.status(500).json({
                    name: 'SomeFieldsInvalid',
                    message:
                        'can not update data because some fields are invalid',
                });

            return res.status(200).json({ success: stdId + ' updated' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[DELETE] /student/remove
    remove = async (req, res) => {
        const ids = req.body;

        // these fields are required
        if (!Array.isArray(ids) || ids.length === 0)
            return res.status(500).json({
                name: 'MissingFieldError',
                message: 'ids parameter is missing',
            });

        try {
            const std = await Student.deleteOne({ _id: { $in: ids } }).exec();
            if (std.deletedCount == 0)
                return res.status(500).json({
                    name: 'StudentNotFound',
                    message: 'No student deleted',
                });

            return res
                .status(200)
                .json({ success: std.deletedCount + ' student deleted' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };
}

module.exports = new StudentController();
