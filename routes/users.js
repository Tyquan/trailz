const express = require('express');
const bcrypt = require('bcryptjs');
const authHelper = require('./authHelper');
const ObjectId = require('mongodb').ObjectID;

const router = express.Router();

//Creating a new User
router.post('/', (req, res, next) => {
    req.body.collection.findOne({type: 'USER_TYPE'}, (err, doc) => {
        if (err)
            return next(err);
        if(doc)
            return next(new Error('Account already registered'));
        let xferUser = {
            type: 'USER_TYPE',
            displayName: req.body.displayName,
            email: req.body.email,
            passwordHash: null,
            date: Date.now(),
            completed: false,
            settings: {
                requireWIFI: true,
                enableAlerts: false
            },
            postFilters: [{
                name: "Technology Companies",
                keyWords: ['Apple', 'Microsoft', 'IBM', 'Amazon', 'Google', 'Intel'],
                enableAlert: false,
                alertFrequency: 0,
                enableAutoDelete: false,
                deleteTime: 0,
                timeOfLastScan: 0,
                postStories: []
            }],
            savedStories: []
        };
        // hash the password
        bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err)
                return next(err);
            xferUser.passwordHash = hash;
            // Save
            req.db.collection.insertOne(xferUser, (err, result) => {
                if (err)
                    return next(err);
                req.node2.send({msg: 'REFRESH_STORIES', doc: result.ops[0]});
                res.status(201).json(result.ops[0]);
            });
        });
    });
});

router.delete('/:id', authHelper.checkAuth, (req, res, next) => {
    if (req.params.id != req.auth.userId)
        return next(new Error('Invalid request for account deletion'));
    req.db.collection.findOneAndDelete({type: 'USER_TYPE', _id: ObjectId(req.auth.userId)}, (err, result) => {
        if (err) {
            console.log(`POSSIBLE USER DELETION CONTENTION? err: ${err}`);
            return next(err);
        } else if(result.ok != 1) {
            console.log(`POSSIBLE UER DELETION ERROR? result: ${result}`);
            return next(new Error('Account deletiob failure'));
        }
        res.status(200).json({ msg: 'User Deleted'});
    });
});

module.exports = router;