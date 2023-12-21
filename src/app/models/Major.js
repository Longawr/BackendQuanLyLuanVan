const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Major = new Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: String,
});

module.exports = mongoose.model('Major', Major);
