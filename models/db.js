//db.js

var mongoose = require('mongoose');
var uri = 'mongodb://localhost/tt_member';
var options = {
	server:{poolSize: 100}
};
var db = mongoose.createConnection(uri, options);

var autoinc = require('mongoose-id-autoinc');
autoinc.init(db);

db.on('error', function(err){
	if(err) console.error('db err', err);
});

db.once('open', function callback(){
	console.info('Mongo db connected successfully');
});

module.exports = db;