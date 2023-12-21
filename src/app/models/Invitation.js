const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Invitation = new Schema(
    {
        groupID: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        sentby: { type: String, required: true, ref: 'students' },
        sentto: { type: String, required: true },
        type: { type: String, required: true, enum: ['SV', 'GV'] },
        isSeen: { type: Boolean, default: false, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Invitation', Invitation);
