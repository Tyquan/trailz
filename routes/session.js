const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jwt-simple');
const authHelper = require('./authHelper');

const router = express.Router();

router.post('/', (req, res, next) => {
    let schema = {
        email: req.body.email,
        password: req.body.email
    };
    req.db.collection.findOne({
        type: 'USER_TYPE',
        email: req.body.email
    }, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user){
            return next(new Error('User was not found'));
        }
        bcrypt.compare(req.body.password, user.passwordHash, (err, match) => {
            if(match){
                try {
                    let token = jwt.encode({
                        authorized: true,
                        sessionIP: req.ip,
                        sessionUA: req.headers['user-agent'],
                        userId: user._id.toHexString(),
                        displayName: user.displayName
                    }, process.env.JWT_SECRET);
                    res.status(201).json({
                        displayName: user.displayName,
                        userId: user._id.toHexString(),
                        token: token,
                        msg: 'Authorized'
                    });
                } catch (err) {
                    return next(err);
                }
            } else {
                return next(new Error('Wrong password'));
            }
        });
    });
});

// Delete the token as a user logs out
router,delete('/:id', authHelper.checkAuth, (req, res, next) => {
    if (req.params.id != req.auth.userId) {
        return next(new Error('Invalid request for logout'));
    }
    res.status(200).json({
        msg: 'Logged out'
    });
});

module.exports = router;