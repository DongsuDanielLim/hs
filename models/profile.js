//profile.js
var path = require('path');
var multer = require('multer');


exports.profileimg = function (files, callback){
	console.log('profile', files);
	var keys = Object.keys(files);
	var length = keys.length;

	if(length == 0){
		console.log('업로드된 파일 없음');
		callback(false);
		return;
	}

	var file = files;
	console.log('file', file);

	var originalname = file.originalname;
	var tempName = file.name;
	var srcpath = file.path;
	var idx = originalname.lastIndexOf('.');
	var tempName = originalname.substring(0, idx);
	var ext = originalname.substring(idx);

	callback()
};