/*
 Shared news stories are those that are seen by all users. People can save, view and comment on news stories. 
*/

const express = require('express');
const authHelper = require('./authHelper');
const router = express.Router();

// Get Shared Stories
router.get('/', authHelper.checkAuth, function (req, res, next) {
    req.db.collection.find({ type: 'SHAREDSTORY_TYPE' }).toArray(function (err, docs) {
        if (err)
            return next(err);
        res.status(200).json(docs);
    });
});

// Create a new shared story
router.post('/', authHelper.checkAuth, (req, res, next) => {
    // make sure we arent at the count limit
    req.db.collection.count({type: 'SHAREDSTORY_TYPE'}, (err, count) => {
        if (err)
            return next(err);
        if (count > process.env.MAX-SHARED-STORIES)
            return next(new Error('Shared story limit reached'));
        
        let xferStory = {
            _id: req.body.storyID,
            type: 'SHAREDSTORY_TYPE',
            story: req.body,
            comments: [{
                displayName: req.auth.displayName,
                userId: req.auth.userId,
                dateTime: Date.now(),
                comment: req.auth.displayName + " enjoy!"
            }]
        };

        req.db.collection.insertOne(xferStory, (err, result) => {
            if (err)
                return next(err);
            res.status(201).json(result.ops[0]);
        });
    });
});

// Delete individual shared stories
router.delete('/:sid'. authHelper.checkAuth, (req, res, next) => {
    req.db.collection.findOneAndDelete({type: 'SHAREDSTORY_TYPE', _id: req.params.sid}, (err, result) => {
        if (err) {
            console.log("+++POSSIBLE CONTENTION ERROR?+++ err:", err);
            return next(err);
        } else if (result.ok != 1) {
            console.log("+++POSSIBLE CONTENTION ERROR?+++ result:", result);
            return next(new Error('Shared story deletion failure'));
        }
        res.status(200).json({ msg: "Shared story deleted!"});
    });
});

// Create a new comment
router.post('/:sid/Comments', authHelper.checkAuth, (req, res, next) => {
    let xferComment = {
        displayName: req.auth.displayName,
        userId: req.auth.userId,
        dateTime: Date.now(),
        comment: req.body.comment.substring(0,250)
    };
    req.db.collection.findOneAndUpdate({type: 'SHAREDSTORY_TYPE', _id: req.params.sid}, {$push: {comments: xferComment}}, (err, result) => {
        if (result && result.value == null) {
            return next(new Error('Comment level reached'));
        } else if (err) {
            console.log("+++POSSIBLE CONTENTION ERROR?+++ err:", err);
            return next(err);
        } else if (result.ok != 1) {
            console.log("+++POSSIBLE CONTENTION ERROR?+++ result:", result);
            return next(new Error('Comment save failure'));
        }

        res.status(201).json({ msg: "Comment added"});
    });
});

module.exports = router;
