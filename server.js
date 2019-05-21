const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cp = require('child_process');
const responseTime = require('response-time');
const assert = require('assert');
const helmet = require('helmet');
const RateLimit = require('express-rate-limit');
const csp = require('helmet-csp');

if(process.env.NODE_ENV !== 'production'){
	require('dotenv').config();
}

const db = {};
const MongoClient = require('mongodb').MongoClient;
const mongodbUri = "mongodb://Tyquan:Jamela17!@ds135926.mlab.com:35926/mocky";
const processMongodbUri = process.env.MONGDB_CONNECT_URL;

MongoClient.connect(mongodbUri, (err, client) => {
	assert.equal(null, err);
	db.client = client;
	db.collection = client.db('trailzdb').collection('trailz');
});

const users = require('./routes/users');
const sessions = require('./routes/session');
const sharedPosts = require('./routes/sharedPosts');
const homePosts = require('./routes/homePosts');

const app = express();

app.enable('trust proxy');

// limit requests
const limiter = new RateLimit({
	windowMs: 15*60*1000, // 15 minutes
	max: 100, // 100 request per windowMs
	delayMs: 0 // disable delaying
});

app.use(limiter);
app.use(helmet());
app.use(csp({
	directives: {
		defaultSrc: ["'self'"],
		scriptSrc: ["'self'", "'unsafe-inline'", 'ajax.googleapis.com', 'maxcdn.bootstrap.com'],
		styleSrc: ["'self'", "'unsafe-inline'", 'maxcdn.bootstrap.com'],
		fontSrc: ["'self'", 'maxcdn.bootstrap.com'],
		imgSrc: ['*']
	}
}));
app.use(responseTime());
app.use(logger('dev'));
app.use(bodyParser.json({
	limit: '100kb'
}));
app.use(express.static(path.join(__dirname, 'build')));
const node2 = cp.fork('./worker/app_FORK.js');
node2.on('exit', (code) => {
	node2 = undefined;
	node2 = cp.fork('./worker/app_FORK.js');
});
app.use((req, res, next) => {
	req.db = db;
	req.node2 = node2;
	next();
});

app.use('/api/users', users);
app.use('/api/sessions', sessions);
app.use('/api/sharedPosts', sharedPosts);
app.use('/api/homePosts', homePosts);

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res, next) => {
	let err = new Error('Not Found');
	err.status = 404;
	next(err);
});

if (app.get('env') === 'development') {
	app.use((err, req, res, next) => {
		res.status(err.status || 500).json({
			message: err.toString(),
			error: err
		});
		console.log(err);
	});
}

app.use((err, req, res, next) => {
	res.status(err.status || 500).json({
		message: err.toString(),
		error: err
	});
	console.log(err);
});

//app.set('port', process.env.PORT || 3000);

const server = app.listen(5000, () => {
	console.log(`Server listening on ${5000}`);
});

server.db = db;
server.node2 = node2;


module.exports = server;