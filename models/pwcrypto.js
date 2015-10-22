//pwcrypto.js

var crypto = require('crypto');


var cryptoDoing = function(pw, salt, callback){
	var iterations = 1000;
	var keylen = 24;

	var iterkey = crypto.pbkdf2Sync(pw, salt, iterations, keylen);
	var crypto_pass = Buffer(iterkey, 'binary').toString('hex');

	var cryptoObj = {
		userSalt : salt,
		iterKey : iterkey,
		cryp_pass2 : crypto_pass
	};

	callback(cryptoObj);
};


exports.cryptoPassword = function(pw, callback){
	var salt = Math.round((new Date().valueOf() * Math.random())) + '';

	cryptoDoing(pw, salt, callback);
};

exports.pwCheck = function(pw, salt, callback){
	cryptoDoing(pw, salt, callback);
};