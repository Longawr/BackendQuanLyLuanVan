if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const socket = require('socket.io');
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const Account = require('./app/models/Account');
const { socketio } = require('./config/socket');

// constants
const port = process.env.PORT || 3000;
const cookieSecret = process.env.COOKIE_SECRET || 'secret';
const domain = process.env.DOMAIN || `http://localhost:${port}`;
const corsOptions = {
    origin: true,
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
    exposedHeaders: ['Content-Length', 'Content-Disposition'],
};

//init app
const app = express();

// apply middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(cookieSecret));
app.use(morgan('dev'));
app.use(cors(corsOptions)); // Use this after the variable declaration

// set file static
app.use(express.static(path.join(__dirname, 'public')));

//route
require('./routes')(app);

//run server
const server = app.listen(port, async (err) => {
    if (err) console.error(err);
    else {
        //connect to database
        await require('./config/db').connect(app);

        //create default accounts
        let account = await Account.exists({
            username: 'Admin',
            role: 'ADMIN',
        });
        if (account == null) {
            //salt round = 10
            const hashedPassword = await bcrypt.hash('Admin', 10);
            await Account.create({
                username: 'Admin',
                hashedPassword,
                role: 'ADMIN',
            });
        }

        console.log(`App listening on ${domain}`);
    }
});

//socket io connection
const io = socket(server, { cors: corsOptions });
app.io = io;
socketio(io);
