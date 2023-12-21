const Student = require('../../app/models/Student');
const Teacher = require('../../app/models/Teacher');

let activeUsers = {};

const getActiveUser = (id) => activeUsers[id];

const socketio = (io) => {
    io.on('connection', (socket) => {
        // disconnect from the server
        socket.on('disconnect', (reason) => {
            // remove user from active users
            for (var key in activeUsers)
                if (activeUsers[key] == socket.id) {
                    console.log(`${key}: disconnect by ${reason}`);
                    delete activeUsers[key];
                }
        });
        // join
        socket.on('join', (newUserID) => {
            let user;

            //check if user exists
            if (newUserID.startsWith('GV'))
                user = Teacher.exists({ _id: newUserID });
            else user = Student.exists({ _id: newUserID });

            // if user is not added previously
            if (user != null && !(newUserID in activeUsers))
                activeUsers[newUserID] = socket.id;
        });
    });

    // put any other code that wants to use the io variable
    // in here
};

module.exports = { getActiveUser, socketio };
