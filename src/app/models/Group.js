const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Group = new Schema(
    {
        name: String,
        projectName: String,
        files: [
            {
                originalname: String,
                size: String,
                mimetype: String,
                percentPlagiarism: Number,
                sources: [
                    {
                        url: String,
                        scholarResult: Boolean,
                        title: String,
                        matches: [
                            {
                                inputStart: Number,
                                inputEnd: Number,
                                matchText: String,
                                score: Number,
                            },
                        ],
                    },
                ],
            },
        ],
        members: [
            {
                _id: String,
                role: {
                    type: String,
                    enum: ['Member', 'Leader'],
                    required: true,
                },
            },
        ],
        teacherID: { type: String, ref: 'Teacher' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Group', Group);
