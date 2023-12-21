const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Account = new Schema(
    {
        username: {
            type: String,
            unique: true,
            required: true,
        },
        hashedPassword: { type: String, required: true },
        role: { type: String, required: true, ref: 'Roles', default: 'SV' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Account', Account);
