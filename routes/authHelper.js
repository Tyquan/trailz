const jwt = require('jwt-simple');

module.exports.checkAuth = (req, res, next) => {
    if (req.headers['x-auth']) {
        try {
            req.auth = jwt.decode(req.headers['x-auth'], process.env.JWT_SECRET);
            if (req.auth && req.auth.authorized && req.auth.userId) {
                return next();
            } else {
                return next(new Error('User is not logged in.'));
            }
        } catch (err) {
            return next(err);
        }
    } else {
        return next(new Error('User is not logged in.'));
    }
};