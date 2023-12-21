if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const bcrypt = require('bcrypt');

const Account = require('../models/Account');

class AccountController {
    //[GET] /account/show
    show = async (req, res) => {
        try {
            const account = await Account.find({}, 'username role')
                .lean()
                .exec();

            return res.status(200).json({ data: account });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[POST] /account/add
    add = async (req, res) => {
        const saltRounds = 10;

        const { username, password } = req.body;
        if (username == null || password == null) {
            return res.status(500).json({
                error: {
                    name: 'FieldMissingError',
                    message: 'You must provide username field',
                },
            });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const newAccount = new Account({
                username,
                hashedPassword,
            });

            await newAccount.save();
            return res.status(200).json({ success: 'register successful' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                name: 'FieldError',
                message: 'Username has existed already',
            });
        }
    };

    //[POST] /account/add-many
    addMany = async (req, res) => {
        //accountArray = [{ username: String, password : String}]
        const { accountArray } = req.body;
        let idArray = [];
        if (!Array.isArray(accountArray) || accountArray.length === 0) {
            return res.status(500).json({
                error: {
                    name: 'FieldMissingError',
                    message: 'Your array is empty',
                },
            });
        }
        accountArray.forEach((account) => {
            idArray.push(account.username);
        });
        try {
            const accounts = await Account.find(
                { username: { $in: idArray } },
                'username'
            )
                .lean()
                .exec();

            if (accounts.length !== 0) {
                return res.status(500).json({
                    error: {
                        name: 'registerError',
                        message:
                            'username in data I response back was already registered',
                        data: accounts,
                    },
                });
            }

            accountArray.forEach(async (account) => {
                account.hashedPassword = await bcrypt.hash(
                    account.password,
                    saltRounds
                );
                account.password = undefined;
            });

            await Account.create(accountArray);

            return res.status(200).json({ success: 'register successful' });
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[DELETE] /account/remove
    remove = async (req, res) => {
        const { acountID } = req.body;

        try {
            const result = await Account.deleteOne({ username: acountID });
            return res.status(200).json(result);
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };

    //[DELETE] /account/remove-many
    removeMany = async (req, res) => {
        const { acountIDArray } = req.body;
        if (!Array.isArray(acountIDArray) || acountIDArray.length === 0)
            return res.status(500).json({
                error: {
                    name: 'FieldMissingError',
                    message: 'Your array is empty',
                },
            });

        try {
            const result = await Account.deleteMany({
                username: { $in: acountIDArray },
            });
            return res.status(200).json(result);
        } catch (error) {
            console.error(error);
            return res.status(500).json(error);
        }
    };
}

module.exports = new AccountController();
