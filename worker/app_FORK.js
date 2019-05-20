const bcrypt = require('bcryptjs');
const https = require("https");
const async = require('async');
const assert = require('assert');
const ObjectId = require('mongodb').ObjectID;
const MongoClient = require('mongodb').MongoClient;

const globalPostDoc;
const POSTS_CATEGORIES = ["home", "world", "national", "business", "technology", "media", "entertainment", "sports"];

const db = {};
MongoClient.connect(process.envMONGODB_CONNECT_URL, (err, client) => {
    assert.equal(null, err);
    db.client = client;
    db.collection = client.db('trailzdb').collection('trailz');
    console.log('Fork process is connected to Mongodb server');
});

process.on('message', (m) => {
    if (m.msg) {
        if (m.msg == 'REFRESH_STORIES') {
            setImmediate((doc) => {
                refreshStoriesMSG(doc, null);
            }, m.doc);
        }
    } else {
        console.log('Message from master:', m);
    }
});


function refreshStoriesMSG(doc, cb) {
    if (!globalPostDoc) {
        db.collection.findOne({_id: process.env.GLOBAL_STORIES_ID}, (err, gDoc) => {
            if (err) {
                console.log('FORK_ERROR: readDocument() read err:' + err);
                if (cb) {
                    return cb(err);
                } else {
                    return;
                }
            } else {
                globalPostDoc = gDoc;
                refreshStories(doc, cb);
            }
        });
    } else {
        refreshStories(doc, cb);
    }
}

function refreshStories(doc, callback) {
    // Loop through all postsFilters and seek matches for all returned stories
    for (var filterIdx = 0; filterIdx < doc.postsFilters.length; filterIdx++) {
        doc.postsFilters[filterIdx].postsStories = [];
        for (var i = 0; i < globalpostsDoc.postsStories.length; i++) {
            globalpostsDoc.postsStories[i].keep = false;
        }
        // If there are keyWords, then filter by them
        if ("keyWords" in doc.postsFilters[filterIdx] && doc.postsFilters[filterIdx].keyWords[0] != "") {
            var storiesMatched = 0;
            for (var i=0; i < doc.postsFilters[filterIdx].keyWords.length; i++) {
                for (var j=0; j < globalpostsDoc.postsStories.length; j++) {
                    if (globalpostsDoc.postsStories[j].keep == false) {
                        var s1 = globalpostsDoc.postsStories[j].title.toLowerCase();
                        var s2 = globalpostsDoc.postsStories[j].contentSnippet.toLowerCase();
                        var keyword = doc.postsFilters[filterIdx].keyWords[i].toLowerCase();
                        if (s1.indexOf(keyword) >= 0 || s2.indexOf(keyword) >= 0) {
                            globalpostsDoc.postsStories[j].keep = true;
                            storiesMatched++;
                        }
                    }
                    if (storiesMatched == process.env.MAX_FILTER_STORIES)
                        break;
                }
                if (storiesMatched == process.env.MAX_FILTER_STORIES)
                    break;
            }
            for (var k = 0; k < globalpostsDoc.postsStories.length; k++) {
                if (globalpostsDoc.postsStories[k].keep == true) {
                    doc.postsFilters[filterIdx].postsStories.push(globalpostsDoc.postsStories[k]);
                }
            }
        }
    }

    // For the test runs, we can inject posts stories under our control.
    if (doc.postsFilters.length == 1 && doc.postsFilters[0].keyWords.length == 1 && doc.postsFilters[0].keyWords[0] == "testingKeyword") {
        for (var i = 0; i < 5; i++) {
            doc.postsFilters[0].postsStories.push(globalpostsDoc.postsStories[0]);
            doc.postsFilters[0].postsStories[0].title = "testingKeyword title" + i;
        }
    }

    // Do the replacement of the posts stories
    db.collection.findOneAndUpdate({ _id: ObjectId(doc._id) }, { $set: { "postsFilters": doc.postsFilters }}, function (err, result) {
        if (err) {
            console.log('FORK_ERROR Replace of postsStories failed:', err);
        } else if (result.ok != 1) {
            console.log('FORK_ERROR Replace of postsStories failed:', result);
        } else {
            if (doc.postsFilters.length > 0) {
                console.log({ msg: 'MASTERposts_UPDATE first filter posts length = ' +
                doc.postsFilters[0].postsStories.length });
            } else {
                console.log({ msg: 'MASTERposts_UPDATE no postsFilters' });
            }
        }
        if (callback)
            return callback(err);
    });
}

staleStoryDeleteBackgroundTimer = setInterval(function () {
    db.collection.find({ type: 'SHAREDSTORY_TYPE' }).toArray(function (err, docs) {
        if (err) {
            console.log('Fork could not get shared stories. err:', err);
            return;
        }
        async.eachSeries(docs, function (story, innercallback) {
            // Go off the date of the time the story was shared
            var d1 = story.comments[0].dateTime;
            var d2 = Date.now();
            var diff = Math.floor((d2 - d1) / 3600000);
            if (diff > 72) {
                db.collection.findOneAndDelete({ type: 'SHAREDSTORY_TYPE',
                _id: story._id }, function (err, result) {
                    innercallback(err);
                });
            } else {
                innercallback();
            }
        }, function (err) {
            if (err) {
                console.log('stale story deletion failure');
            } else {
                console.log('stale story deletion success');
            }
        });
    });
}, 24 * 60 * 60 * 1000);