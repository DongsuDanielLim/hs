//updateMakecard.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment');
var fs = require('fs');
var path = require('path');

var notipush = require('./notipush');
var db = require('./db');
require('./notischema');
require('./memberschema');
require('./newsschema');
require('./commentschema');
var notiModel = db.model('Notice');
var memberModel = db.model('Member');
var newsModel = db.model('NewsCard');
var commentModel = db.model('NewsComment');


var savecardCheck = function(mydata, umail, waterCallback){
	async.each(mydata._savedCards, function(cardid, callback){
		newsModel.findOne({_id:cardid}).exec(function (err, ndata){
			//console.log('what the ndata', ndata);
			if(err){
				var error = 'savecardCheckErr';
				concsole.log('mypage c update err', err);
				callback(err, error);
			}else if(ndata == null){
				memberModel.update({email:umail}, {$pull:{'_makeCards':cardid, '_savedCards':cardid}}, {multi:true}).exec(function (err, test){
					//console.log('pull update', test);
					callback(null, false);
				});
			}else{
				callback(null, true);
			}
		});
	},function(err, error){
		if(err){
			console.log('savecardCheck err', err);
			waterCallback(err, error);
		}else{
			waterCallback(null, mydata, umail);
		}
	});
};

var makecardCheck = function(mydata, umail, waterCallback){
	async.each(mydata._makeCards, function(cardid, callback){
		newsModel.findOne({_id:cardid}).exec(function (err, ndata){
			//console.log('what the ndata', ndata);
			if(err){
				var error = 'savecardCheckErr';
				concsole.log('mypage c update err', err);
				callback(err, error);
			}else	if(ndata == null){
				memberModel.update({email:umail}, {$pull:{'_makeCards':cardid, '_savedCards':cardid}}, {multi:true}).exec(function (err, test){
					//console.log('pull update', test);
					callback(false);
				});
			}else{
				callback(true);
			}
		});
	},function(err, error){
		if(err){
			waterCallback(err, error);
		}else{
			console.log('final');
			waterCallback(null, true);
		}
	});
};

//사용자의 makeCards와 savedCards 목록에서 없는 뉴스카드는 목록에서 제외
exports.updateCards = function (datas, callback){
	var mail = datas;
	memberModel.findOne({email:mail}).exec(function (err, mydata){
		if(err){
			console.log('test err', err);
			callback(err);
		}else{
			console.log('updateCards start');
			async.waterfall([
				function(callback){
					savecardCheck(mydata, mail, callback);
				},
				function(mydata, mail, callback){
					makecardCheck(mydata, mail, callback);
				}
			], function(err, result){
				if(err){
					console.log('updateCards err', err);
				}
				callback(result);
			});
		}
	});
};

var followerCheck = function(mydata, umail, waterCallback){
	async.each(mydata._follower, function(userid, callback){
		memberModel.findOne({_id:userid}).exec(function (err, udata){
			//console.log('what the ndata', udata.delyn);
			if(err){
				var error = 'followerCheckErr';
				concsole.log('mypage f update err', err);
				callback(err, error);
			}else if(udata == null){
				memberModel.update({email:umail}, {$pull:{'_follower':userid, '_following':userid}}, {multi:true}).exec(function (err, test){
					console.log('pull update', test);
					callback(null, false);
				});
			}else{
				if(udata.delyn == 'Y'){
					console.log('udata null', udata);
					memberModel.update({email:umail}, {$pull:{'_follower':userid, '_following':userid}}, {multi:true}).exec(function (err, test){
						console.log('pull update', test);
						callback(null, false);
					});
				}else{
					callback(null, true);
				}
			}
		});
	},function(err, error){
		if(err){
			console.log('savecardCheck err', err);
			waterCallback(err, error);
		}else{
			waterCallback(null, mydata, umail);
		}
	});
};

var followingCheck = function(mydata, umail, waterCallback){
	async.each(mydata._following, function(userid, callback){
		memberModel.findOne({_id:userid}).exec(function (err, udata){
			// console.log('what the udata', udata);
			// console.log('what the udata', udata.delyn);
			if(err){
				var error = 'followerCheckErr';
				concsole.log('mypage f update err', err);
				callback(err, error);
			}else if(udata == null){
				console.log('udata null', udata);
				memberModel.update({email:umail}, {$pull:{'_follower':userid, '_following':userid}}, {multi:true}).exec(function (err, test){
					console.log('pull update', test);
					callback(false);
				});
			}else{
				if(udata.delyn == 'Y'){
					console.log('udata null', udata);
					memberModel.update({email:umail}, {$pull:{'_follower':userid, '_following':userid}}, {multi:true}).exec(function (err, test){
						console.log('pull update', test);
						callback(null, false);
					});
				}else{
					callback(null, true);
				}
			}
		});
	},function(err, error){
		if(err){
			waterCallback(err, error);
		}else{
			console.log('final');
			waterCallback(null, true);
		}
	});
};

//탈퇴한 회원은 follower following목록에서 삭제
exports.updateFollower = function (datas, callback){
	var mail = datas;
	memberModel.findOne({email:mail}).exec(function (err, mydata){
		if(err){
			console.log('test err', err);
			callback(err);
		}else{
			console.log('updateFollower start');

			async.waterfall([
				function(callback){
					followerCheck(mydata, mail, callback);
				},
				function(mydata, mail, callback){
					followingCheck(mydata, mail, callback);
				}
			], function(err, result){
				if(err){
					console.log('updateFollower err', err);
				}
				callback(result);
			});
		}
	});
};
