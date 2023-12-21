if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const mongoose = require('mongoose');
const MeganzController = require('../../app/utils/MeganzController');
const RefreshToken = require('../../app/models/RefreshToken');

const username = encodeURIComponent(process.env.DB_USERNAME);
const password = encodeURIComponent(process.env.DB_PASSWORD);
const cluster = encodeURIComponent(process.env.DB_CLUSTER);
const database = encodeURIComponent(process.env.DB_NAME);

async function connect(app) {
    let db;

    if (
        username != 'undefined' &&
        password != 'undefined' &&
        cluster != 'undefined' &&
        database != 'undefined'
    )
        db = `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority`;
    else
        db =
            'mongodb+srv://hoanglong:12345Sau@longawr.sxjemcj.mongodb.net/QuanLyDoAn';

    try {
        await mongoose.connect(db);
        console.log('conneceted to ' + db);

        //catches ctrl+c event
        process.on('SIGINT', cleanup);
        //catches program termination event
        process.on('SIGTERM', cleanup);
        process.on('SIGHUP', cleanup);
        if (app) {
            app.set('mongoose', mongoose);
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

//close process socket
async function cleanup() {
    await RefreshToken.deleteMany({});
    await mongoose.connection.close();
    await MeganzController.closeStorage();
    process.exit(0);
}

module.exports = { connect, cleanup };
