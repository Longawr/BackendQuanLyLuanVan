const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClassName = new Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: String,
});

module.exports = mongoose.model('ClassName', ClassName);
