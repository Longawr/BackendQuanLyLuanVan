const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Teacher = new Schema(
    {
        _id: String,
        name: { type: String, default: 'Teacher' },
        birthday: { type: Date, default: new Date() },
        major: { type: String, ref: 'Major' },
        email: {
            type: String,
            lowercase: true,
        },
        phone: String,
        address: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model('Teacher', Teacher);
