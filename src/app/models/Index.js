const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Index = new Schema({
    name: String,
    value: { type: String, default: 1 },
});

module.exports = mongoose.model('Index', Index);
