const multer = require('multer');
// const fs = require('fs');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         const groupID = req.body.groupID;
//         const re =
//             /[<>:"\/\\|?*\x00-\x1F]|^(?:aux|con|clock\$|nul|prn|com[1-9]|lpt[1-9])$/i;
//         if (re.test(groupID)) return cb(new Error('groupID is invalid'));

//         const folder = `src/uploads/files/${groupID}`;

//         fs.mkdirSync(folder, { recursive: true });
//         return cb(null, folder);
//     },
//     filename: function (req, file, cb) {
//         const groupID = req.body.groupID;
//         const re =
//             /[<>:"\/\\|?*\x00-\x1F]|^(?:aux|con|clock\$|nul|prn|com[1-9]|lpt[1-9])$/i;

//         if (!re.test(groupID)) {
//             const folder = `src/uploads/files/${groupID}/`;

//             if (fs.existsSync(folder + file.originalname))
//                 return cb(
//                     new Error(
//                         'Please remove the original file before replacing it'
//                     )
//                 );
//         }
//         if (!re.test(file.originalname)) return cb(null, file.originalname);
//         return cb(new Error('Invalid file name'));
//     },
// });

const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
