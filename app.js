var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var multer = require('multer');
var redis = require('redis');
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var http = require('http');
var https = require('https');
var fs = require('fs');

var options = {
    key: fs.readFileSync('./key.pem', 'utf8'),
    cert: fs.readFileSync('./server.crt', 'utf8')
};

var port1 = 80;
var port2 = 443;

var client = redis.createClient();
//var app = express();

var routes = require('./routes/index');
var users = require('./routes/users');
var news = require('./routes/news');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/*var db = mongoose.connect('mongodb://localhost/tt_member', function (err){
    if(err){
        console.log('mongoose connection error : ', err);
    }
    console.log('mongodb connection');
});*/

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
/*app.use(session({
    key: 'app.sess',
    secret: 'test cat',
    resave: false,
    saveUninitialized: true
}));*/
app.use(session(
    {
        secret: 'test cat',
        store: new redisStore(
            { host: 'localhost', port: 6379, client: client }
        ),
        saveUninitialized: false,
        resave: false
    }
));

//multer사용하기
app.use(multer({
  dest: './public/profile/',
  rename: function (fieldname, filename) {
    //return filename.replace(/\W+/g, '-').toLowerCase() + Date.now()
    return filename.replace(/\W+/g, '-').toLowerCase() + '-profile';
  }
}));

app.use('/', routes);
app.use('/users', users);
app.use('/news', news);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/*app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function(){
    console.log('mongo/app.js : 서버가 ' + server.address().port + '포트에서 실행중');
});*/

/*app.set('port', process.env.PORT || 80);
var server = app.listen(app.get('port'), function(){
    console.log('mongo/app.js : 서버가 ' + server.address().port + '포트에서 실행중');
});*/

http.createServer(app).listen(port1, function(){
    console.log('http server가 리슨 앤 뤼핏' + port1);
});

https.createServer(options, app).listen(port2, function(){
    console.log('http server가 리슨 앤 뤼핏' + port2);
});

module.exports = app;
