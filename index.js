var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var engines = require('consolidate');

var handlebars = require('handlebars');
var layouts = require('handlebars-layouts');
var extend = require('handlebars-extend-block');

var bodyParser = require('body-parser');
var express = require('express');

var app = express();

app.get('/', function(req, res) {
	//res.send('Hello, world!');
	//res.render('index');
	res.render('index', { title: 'Hey', message: 'Hello there!', users: 'users'});
});

function getUserFilePath(username) {
	return path.join(__dirname, 'users', username) + '.json';
};

function getUser(username) {
	var user = JSON.parse(fs.readFileSync(getUserFilePath(username), {encoding: 'utf8'}));
	user.name.full = _.startCase(user.name.first + ' ' + user.name.last);
	_.keys(user.location).forEach(function(key) {
		user.location[key] = _.startCase(user.location[key]);
	});
	return user;
};

function saveUser(username, data) {
	var fp = getUserFilePath(username);
	fs.unlinkSync(fp);
	fs.writeFileSync(fp, JSON.stringify(data, null, 2), {encoding: 'utf8'});
};

handlebars.registerHelper(layouts(handlebars));
handlebars = extend(handlebars);
app.engine('hbs', engines.handlebars);
app.set('views', __dirname + '/views/layouts');
app.set('partials', __dirname + '/views/partials');
app.set('view engine', 'hbs');

//app.engine('html', require('hbs').__express);
//app.set('view engine', 'html');

app.use('/public', express.static('public'));
app.use('/images', express.static('images'));
app.use(bodyParser.urlencoded({extended: true}));

app.get('/favicon.ico', function(req, res) {
	res.end();
});

app.get('/', function(req, res) {
	var users = [];
	fs.readdir('users', function(err, files) {
		files.forEach(function(file) {
			fs.readFile(path.join(__dirname, 'users', file), {encoding: 'utf8'}, function(err, data) {
				var user = JSON.parse(data);
				user.name.full = _.startCase(user.name.first + ' ' + user.name.last);
				users.push(user);
				if(users.length === files.length) {
					res.render('index', {users: users});
				}
			})
		})
	})
});

function verifyUser(req, res, next) {
	var fp = getUserFilePath(req.params.username);
	
	fs.exists(fp, function(yes) {
		if(yes) {
			next();
		} else {
			res.redirect('/error/' + req.params.username);
		}
	});
};

app.get('*.json', function(req, res) {
	res.download('./users' + req.path);
});

app.get('/data/:username', function(req, res) {
	var username = req.params.username;
	var user = getUser(username);
	res.json(user);
});

app.get('/:username', verifyUser, function(req, res) {
	var username = req.params.username;
	var user = getUser(username);
	res.render('user', {
		user: user,
		address: user.location
	});
});

app.get('/error/:username', function(req, res) {
	res.status(404).send('No user named ' + req.params.username + ' found');
});

app.all('/:username', function(req, res, next) {
	console.log(req.method, 'for', req.params.username);
	next();
});

app.put('/:username', function(req, res) {
	var username = req.params.username;
	var user = getUser(username);
	user.location = req.body;
	saveUser(username, user);
	res.end();
});

app.delete('/:username', function(req, res) {
	var fp = getUserFilePath(req.params.username);
	fs.unlinkSync(fp);
	res.sendStatus(200);
});

var server = app.listen(3000, function() {
	console.log('Server running at http://localhost:' + server.address().port);
});