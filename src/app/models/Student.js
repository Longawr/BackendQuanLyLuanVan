const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Student = new Schema(
    {
        _id: String,
        name: { type: String, default: 'Student' },
        birthday: { type: Date, default: new Date() },
        className: { type: String, ref: 'ClassName' },
        major: { type: String, ref: 'Major' },
        email: {
            type: String,
            lowercase: true,
        },
        phone: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model('Student', Student);
