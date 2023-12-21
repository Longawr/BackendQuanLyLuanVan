const JwtController = require('../app/utils/JwtController');

const checkAuthenticated = async (req, res, next) => {
    try {
        let { user, error } = await JwtController.checkAuthenticated(req);
        if (error) return res.status(401).json(error);
        req.user = user;
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError')
            return res.status(401).json({ error });

        console.error(error);
        return res
            .status(401)
            .json({ name: 'InternalServerError', message: error.message });
    }
};

const checkNotAuthenticated = async (req, res, next) => {
    try {
        const { user, error } = await JwtController.checkAuthenticated(req);
        if (user)
            return res
                .status(401)
                .json({ name: 'AccessDenied', message: 'You must not login' });

        await JwtController.clearRefreshToken(req, res);
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            await JwtController.clearRefreshToken(req, res);
            return next();
        }
        console.error(error);
        return res
            .status(401)
            .json({ name: 'InternalServerError', message: error.message });
    }
};

const teacherAuthenticated = async (req, res, next) => {
    try {
        let { user, error } = await JwtController.checkAuthenticated(req);
        if (error) return res.json(error);
        if (user.role != 'GV' || user.role != 'ADMIN')
            return res
                .status(401)
                .json({
                    name: 'AccessDenied',
                    message: 'You must be a teacher',
                });
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError')
            return res.status(401).json(error);

        console.error(error);
        return res
            .status(401)
            .json({ name: 'InternalServerError', message: error.message });
    }
};

const adminAuthenticated = async (req, res, next) => {
    try {
        let { user, error } = await JwtController.checkAuthenticated(req);
        if (error) return res.json(error);
        if (user.role != 'ADMIN')
            return res
                .status(401)
                .json({
                    name: 'AccessDenied',
                    message: 'You must be an admin',
                });
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError')
            return res.status(401).json(error);
        console.error(error);
        return res
            .status(401)
            .json({ name: 'InternalServerError', message: error.message });
    }
};

module.exports = {
    checkAuthenticated,
    checkNotAuthenticated,
    teacherAuthenticated,
    adminAuthenticated,
};
