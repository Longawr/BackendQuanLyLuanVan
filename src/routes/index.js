const accountRoute = require('./accountRoute');
const authRoute = require('./authRoute');
const groupRoute = require('./groupRoute');
const invitationRoute = require('./invitationRoute');
const siteRoute = require('./siteRoute');
const studentRoute = require('./studentRoute');
const teacherRoute = require('./teacherRoute');

function route(app) {
    app.use('/account', accountRoute);
    app.use('/auth', authRoute);
    app.use('/group', groupRoute);
    app.use('/invitation', invitationRoute);
    app.use('/student', studentRoute);
    app.use('/teacher', teacherRoute);
    app.use('/', siteRoute);
}

module.exports = route;
