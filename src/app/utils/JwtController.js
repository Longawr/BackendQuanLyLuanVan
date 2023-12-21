if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const jwt = require('jsonwebtoken');

const Account = require('../models/Account');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const RefreshToken = require('../models/RefreshToken');

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'secret';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'secret';

const getAccessToken = (req) => {
    var token = null;
    if (req && req.cookies) {
        token = req.cookies.accessToken;
    }
    return token;
};

const getRefreshToken = (req) => {
    var token = null;
    if (req && req.signedCookies) {
        token = req.signedCookies.refreshToken;
    }
    return token;
};

const getUserByUsername = async (username) => {
    const account = await Account.findOne({ username }, 'role').exec();
    if (account == null)
        return { error: { name: 'InputError', message: 'User not found' } };
    if (username === 'Admin' && account.role === 'ADMIN')
        return { user: { _id: 'Admin', name: 'Admin', role: 'ADMIN' } };

    let data;
    switch (account.role) {
        case 'SV':
            data = await Student.findOne(
                { _id: username },
                'name birthday major email phone'
            ).exec();
            break;
        case 'GV':
        case 'ADMIN':
            data = await Teacher.findOne(
                { _id: username },
                'name birthday major email phone'
            ).exec();
            break;
        default:
            return {
                error: {
                    name: 'InputError',
                    message: 'User do not have a role',
                },
            };
    }

    if (data == null)
        return {
            error: {
                name: 'InternalServerError',
                message: 'this acccount does not have an user',
            },
        };
    return { user: { ...data.toObject(), role: account.role } };
};

const generateToken = (id) => {
    const payload = { id };
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'secret';
    const newAccessToken = jwt.sign(payload, accessTokenSecret, {
        expiresIn: '30m',
    });
    const newRefreshToken = jwt.sign(payload, refreshTokenSecret, {
        expiresIn: '7d',
    });
    return { newAccessToken, newRefreshToken };
};

const saveRefreshToken = async (refreshToken) => {
    const sevenDays = 7;
    let refreshTokenExpiredTime = new Date();

    refreshTokenExpiredTime.setDate(
        refreshTokenExpiredTime.getDate() + sevenDays
    );

    const refreshTokenDocument = new RefreshToken({
        value: refreshToken,
        expireAt: refreshTokenExpiredTime,
    });
    await refreshTokenDocument.save();
};

const setCookies = (res, accessToken, refreshToken) => {
    const sevenDaysInMillisecond = 7 * 24 * 60 * 60 * 1000;
    const thirtyMinutesInMillisecond = 30 * 60 * 1000;

    const accessOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        expires: new Date(Date.now() + thirtyMinutesInMillisecond),
    };
    const refreshOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth',
        expires: new Date(Date.now() + sevenDaysInMillisecond),
        signed: true,
    };

    res.cookie('accessToken', accessToken, accessOptions);
    res.cookie('refreshToken', refreshToken, refreshOptions);
    return accessOptions.expires;
};

const checkRefreshToken = async (req) => {
    const refreshToken = getRefreshToken(req);
    if (refreshToken == null)
        return {
            error: {
                name: 'InvalidTokenError',
                message: 'No such token found',
            },
        };

    const { id } = jwt.verify(refreshToken, refreshTokenSecret);

    const [refreshTokenDocument, { user, error }] = await Promise.all([
        RefreshToken.findOne({ value: refreshToken }).exec(),
        getUserByUsername(id),
    ]);

    if (error) return { error };
    if (refreshTokenDocument == null) {
        return {
            error: {
                name: 'InvalidTokenError',
                message: 'Invalid refresh token',
            },
        };
    }
    if (refreshTokenDocument.expires < new Date()) {
        return {
            error: {
                name: 'InvalidTokenError',
                message: 'your refresh token expired',
            },
        };
    }

    if (error) {
        return {
            error: {
                name: 'InvalidTokenError',
                message: error,
            },
        };
    }

    return {
        user: user,
        refreshToken: refreshTokenDocument.toObject(),
    };
};

class JWTController {
    tokenHandler = async (id, res) => {
        if (!id)
            return {
                error: { name: 'WrongTokenError', message: 'No ID provided' },
            };
        const { newAccessToken, newRefreshToken } = generateToken(id);
        const [, accessExpiresTime] = await Promise.all([
            saveRefreshToken(newRefreshToken),
            setCookies(res, newAccessToken, newRefreshToken),
        ]);
        return { accessExpiresTime };
    };

    checkAuthenticated = async (req) => {
        const accessToken = getAccessToken(req);
        if (accessToken == null)
            return {
                error: {
                    name: 'InvalidTokenError',
                    message: 'No such token found',
                },
            };
        const { id } = jwt.verify(accessToken, accessTokenSecret);
        const { user, error } = await getUserByUsername(id);
        if (error) return { error };
        if (user == null)
            return {
                error: {
                    name: 'InvalidTokenError',
                    message: 'Invalid access token',
                },
            };
        return { user };
    };

    refreshToken = async (req, res) => {
        const { user, refreshToken, error } = await checkRefreshToken(req);
        if (error) return { error };

        const { accessExpiresTime } = await this.tokenHandler(user._id, res);
        await RefreshToken.deleteOne({ _id: refreshToken._id });
        return { accessExpiresTime, role: user.role };
    };

    clearRefreshToken = async (req, res) => {
        res.clearCookie('accessToken');
        const refreshToken = getRefreshToken(req);
        if (refreshToken == null)
            return {
                error: {
                    name: 'NoTokenError',
                    message: 'There No Refresh Token',
                },
            };
        res.clearCookie('refreshToken');

        const result = await RefreshToken.findOneAndDelete({
            value: refreshToken,
        });
        if (!result)
            return {
                error: {
                    name: 'RefreshTokenError',
                    message: 'Your refresh token wrong',
                },
            };
        return { success: 'clear refresh token successful' };
    };
}

module.exports = new JWTController();
