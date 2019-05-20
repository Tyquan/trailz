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

// Delete a User
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

// Retrieve a single User
router.get('/:id', authHelper.checkAuth, (req, res, next) => {
    // Verify the passed in id to delete is the same as  the auth token
    if (req.params.id != req.auth.userId)
        return next(new Error('Invalid request for account fetch'));
    req.db.collection.findOne({type: 'USER_TYPE', _id: ObjectId(req.auth.userId)}, (err, doc) => {
        if (err)
            return next(err);
        let xferProfile = {
            email: doc.email,
            displayName: doc.displayName,
            date: doc.date,
            settings: doc.settings,
            postFilters: doc.postFilters,
            savedStories: doc.savedStories
        };
        res.header("Cache-Control", "no-cache, no-store, must-revaidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
        res.status(200).json(xferProfile);
    }); 
});

// Update a User
router.put('/:id', authHelper.checkAuth, (req, res, next) => {
    if (req.params.id != req.auth.userId)
        return next(new Error('Invalid request for account deletion'));
    // limit the postFilters
    if (req.body.postFilters.length > process.env.MAX_FILTERS)
        return next(new Error('Too many postFilters'));
    // clear out leading and trailing spaces
    for (let i = 0; i < req.body.postFilters.length; i++) {
        if ("keywords" in req.body.postFilters[i] && req.body.postFilters[i].keyWords[0] != "") {
            for (let j = 0; j < req.body.postFilters[i].keyWords.length; j++) {
                req.body.postFilters[i].keyWords[j] = req.body.postFilters[i].keyWords[j].trim();
            }
        }
    }

    req.db.collection.findOneAndUpdate({type: 'USER_TYPE', _id: ObjectId(req.auth.userId)}, {$set: {settings: {requireWIFI: req.body.requireWIFI, enableAlerts: req.body.enableAlerts}, postFilters: req.body.postFilters}}, {returnOriginal: false}, (err, result) => {
        if (err) {
            console.log("+++POSSIBLE USER PUT CONTENTION ERROR?+++ err:", err);
            return next(err);
        } else if(result.ok != 1) {
            console.log("+++POSSIBLE CONTENTION ERROR?+++ result:", result);
            return next(new Error('User PUT failure'));
        }
        req.node2.send({msg: 'REFRESH_STORIES', doc: result.value});
        res.status(200).json(result.value);
    });
});

module.exports = router;