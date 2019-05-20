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
    

module.exports = router;
