const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RefreshToken = new Schema({
    value: { type: String, required: true, unique: true, index: true },
    expireAt: { type: Date, expires: 0, default: new Date(), required: true },
});

module.exports = mongoose.model('RefreshToken', RefreshToken);
