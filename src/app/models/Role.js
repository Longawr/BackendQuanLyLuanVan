const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Role = new Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        enum: ['ADMIN', 'GV', 'SV'],
    },
    name: String,
    decription: String,
});

module.exports = mongoose.model('Role', Role);
