//notipush.js
//notipush.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
//var notice = require('./notischema');
var gcm = require('../gcm/gcm');
var db = require('./db');
require('./notischema');
require('./memberschema');
require('./newsschema');
require('./commentschema');
var notiModel = db.model('Notice');
var memberModel = db.model('Member');
var newsModel = db.model('NewsCard');
var commentModel = db.model('NewsComment');


//내가 팔로잉하는 사람이 뉴스를 공유할 때 알림 - type 1
exports.makeCardNoti = function (cUobj, pushObj, callback){
	console.log('notipush cUobj', cUobj);
	console.log('notipush cUobj', pushObj);
	notiModel.update({user_id:{$in:cUobj._follower}}, {$push:{ _noti:pushObj}}, {multi:true}).exec(function (err, notic){
		if(err){
			console.log('mongo postCard noti err', err);
			callback(false);
		}else{
			console.log('mongo postCard noti', notic);
			callback(true);
		}
	});
};

//내가 공유한 카드를 누가 공감했을 때 알림 - type2
exports.likeCardNoti = function (cUobj, pushObj, callback){
	console.log('cUobj', cUobj._id);
	notiModel.update({user_id:cUobj._id}, {$push:{ _noti:pushObj}}).exec(function (err, notic){
		if(err){
			console.log('mongo likeCard noti err', err);
			callback(false);
		}else{
			console.log('mongo likeCard noti', notic);
			console.log('mongo likeCard messageType', pushObj.message);
			console.log('mongo likeCard pushKey', cUobj.pushKey);
			gcm.gcmPush(pushObj.message, cUobj.pushKey, pushObj);
			callback(true);
		}
	});
};

//내가 공유한 카드에 누가 댓글을 달았을 때 - type 3
exports.commentCard = function(cUobj, pushObj, callback){
 console.log('cUobj', cUobj._id);
 notiModel.update({user_id:cUobj._id}, {$push:{_noti:pushObj}}).exec(function (err, notice){
	 	if(err){
	 		console.log('mongo postCard noti err', err);
	 		callback(false);
	 	}else{
	 		console.log('mongo postCard noti', notice);
	 		callback(true);
	 	}
 });
};

//내 댓글에 공감 -type 4
exports.commentLike = function(cUobj, pushObj, callback){
	notiModel.update({user_id:cUobj._id}, {$push:{_noti:pushObj}}).exec(function (err, notice){
		if(err){
			console.log('mongo postCard noti err', err);
			callback(false);
		}else{
			console.log('mongo postCard noti', notice);
			gcm.gcmPush(pushObj.message, cUobj.pushKey, pushObj);
			callback(true);
		}
	});
};


//내가 공유한 카드의 조회수가 N회를 넘었을 때 -type 5
exports.beyondShare = function(finfo, pushObj, callback){
	console.log('finfo', finfo._id);
	notiModel.update({user_id:finfo._id}, {$push:{_noti:pushObj}}).exec(function (err, notice){
		if(err){
			console.log('mongo follow noti err', err);
			callback(false);
		}else{
			console.log('mongo follow noti', notice);
			callback(true);
		}
	});
};

//다른 사용자가 나를 팔로우 했을 때 -type 6
exports.userFollower = function(finfo, pushObj, callback){
	console.log('finfo', finfo._id);
	notiModel.update({user_id:finfo._id}, {$push:{_noti:pushObj}}).exec(function (err, notice){
		if(err){
			console.log('mongo follow noti err', err);
			callback(false);
		}else{
			console.log('mongo follow noti', notice);
			callback(true);
		}
	});
};
//
exports.notiCancel = function(cUobj, pushObj, callback){
	notiModel.update({user_id:cUobj._id}, {$pull:{_noti:pushObj}}).exec(function (err, notice){
		if(err){
			console.log('mongo postCard noti err', err);
			callback(false);
		}else{
			console.log('mongo postCard noti', notice);
			gcm.gcmPush(pushObj.message, cUobj.pushKey, pushObj);
			callback(true);
		}
	});
};