/*
    A user does not need to be logged in to see these stories.
*/

const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    req.body.collection.findOne({
        _id: process.env.GLOBAL_STORIES_ID
    }, {
        homePostStories: 1
    }, (err, doc) => {
        if (err)
            return next(err);
        res.status(200).json(doc.homePostStories);
    });
});

module.exports = router;