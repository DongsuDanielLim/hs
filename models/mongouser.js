//mongouser.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment');
var fs = require('fs');
var path = require('path');

var cryptoMethod = require('./pwcrypto');
var mypUpdate = require('./updateMypage');
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


var Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;
ObjectId("54e9b1f9356334c47e03b046")


exports.mypage = function(data, callback){
	var mail = data;
	console.log('mongo mypage mail', mail);
	//.populate('_makeCards').populate('_savedCards').populate('_follower', {email:1, name:1, profileImg:1}).populate('_following', {email:1, name:1, profileImg:1}).populate('_history')

	mypUpdate.updateCards(mail, function(){
		mypUpdate.updateFollower(mail, function(){
			memberModel.findOne({email:mail, delyn:'N'}, {password:0, delyn:0})
			.exec(function (err, test){
				if(err){
					console.log('mongo mypage err', err);
					callback(false);
				}else if(test==null){
					console.log('mongo mypage email null', test.email);
					callback(false);
				}else if(test.email == mail){
					var options = {
						path: '_makeCards._creator',
						model: 'Member',
						select: {email:1, name:1, profileImg:1}
					};

					memberModel.populate(test, options, function (err, rows){
						if(err){
							console.log('mongo mypage err', err);
							callback(err);
						}else if(rows){
							callback(rows);
						}
					});
				}
			});
		});
	});
};

//다른사람의 유저페이지
exports.userpage = function(data, callback){
	var mail = data;
	console.log('mongo mypage mail', mail);
	//.populate('_makeCards').populate('_savedCards').populate('_follower', {email:1, name:1, profileImg:1}).populate('_following', {email:1, name:1, profileImg:1}).populate('_history')
	memberModel.findOne({email:mail, delyn:'N'}, {password:0, delyn:0})
	.populate('_makeCards')
	.exec(function (err, user){
		if(err){
			console.log('mongo userpage err', err);
			callback(false);
		}else if(user==null){
			console.log('mongo userpage email null', user.email);
			callback(false);
		}else if(user.email == mail){
			var options = {
				path: '_makeCards._creator',
				model: 'Member',
				select: {_id:1, email:1, name:1, profileImg:1, likeCategory:1, belongto:1}
			};

			memberModel.populate(user, options, function (err, rows){
				if(err){
					console.log('mongo userpage err', err);
					callback(err);
				}else if(rows){
					//console.log('mongo userpage success', rows);
					callback(rows);
				}
			});
		}
	});
};

exports.login = function(datas, callback){
	console.log('mongo login datas', datas);
	console.log('mongo login mail', datas.email);
	console.log('mongo login pw', datas.pw);


	/*Member.findOne({email:datas.email, password:datas.pw}).select('email').select('likeCategory')*/
	memberModel.findOne({email:datas.email}).exec(function (err, row){
		if(err){ // query err
			console.log('mongo:login',err);
			callback(false)
		}else if(!row){ // no member
			console.log('mongo:login !row', row);
			callback(row);
		}else{
			cryptoMethod.pwCheck(datas.pw, row.salt, function(cryptoObj){
				if(row.password == cryptoObj.cryp_pass2){
					memberModel.findOne({email:datas.email, password:cryptoObj.cryp_pass2}, {password:0, salt:0}).exec(function (err, uinfo){
						callback(uinfo);
					});
				}else{
					callback(false);
				}
			});
		}
	});
};

//페이스북계정으로 가입했는지 확인
exports.fbUseralready = function(params, callback){
	memberModel.findOne({fbid:params}, {_id:1, email:1, name:1, profileImg:1, likeCategory:1, belongto:1}).exec(function (err, info){
		if(err){
			console.log('mongo fbUseralready err', err);
			callback(err);
		}else if(!info){
			console.log('mongo fbUseralready null', info);
			callback(false);
		}else if(info._id){
			//console.log('mongo fbUseralready info', info);
			callback(info);
		}
	});
};

//회원가입 : 페이스북 계정 체크
var fbUserCheck = function(obj, callback){
	console.log('mongo fbUserCheck id', obj.id);
	memberModel.findOne({fbid:obj.id}, {_id:1}).exec(function(err, info){
		if(err){
			console.log('mongo fbjoin usercheck err', err);
			callback(err);
		}else if(info){
			console.log('mongo fbjoin:already member', info);
			callback(null, info);
		}else if(info==null){
			console.log('mongo fbjoin:gogo');
			callback(null, obj);
		}
	});
};

//일단은 이름과 프로필사진만 저장
var fbJoinSave = function(obj, callback){
	var fbJoinMember = new memberModel({
		fbid : obj.id,
		name: obj.name,
		email: obj.email,
		joinpath: 'f',
		profileImg: obj.profileimg,
		regdate: Date.now(),
		pushKey:obj.pushKey
	});

	fbJoinMember.save(function(err, info){
		if(err){
			console.log('mongo fbjoinsave err', err);
			callback(err);
		}else{
			console.log('mongo fbjoinsave success', info);
			callback(null, info);
		}
	});
};

var makeNoticePack = function(uobj, callback){
	var mNoticeSchema = new notiModel({
		user_email : uobj.email,
		user_id : uobj._id
	});

	mNoticeSchema.save(function (err, info){
		if(err){
			console.log('mongo fbjoinsave err', err);
			callback(err);
		}else{
			console.log('mongo fbjoinsave success', info);
			callback(true);
		}
	});
};

exports.fbJoin = function(dataObj, callback){
	console.log('mongo fblogin obj', dataObj);
	console.log('mongo fblogin obj pushKey', dataObj.pushKey);
	var userId = dataObj.id;
	var name = dataObj.name;
	var mail = dataObj.email;
	//var profileimg = dataObj.profileimg;
	var profileimg = dataObj.profilePath;

	async.waterfall([
		function(callback){
			fbUserCheck(dataObj, callback);
		},function(obj, callback){
			if(!obj){
				callback('Error', false)
			}else if(obj._id){
				callback('Error', 'alredy');
			}else{
				fbJoinSave(obj, callback);
			}
		},function(info, callback){
			if(!info){
				callback(false);
			}else{
				makeNoticePack(info, callback);
			}
		}
	], function(flag){
		console.log('mongo fbjoin waterfall', flag);
		if(flag){
			callback(true);
		}else if(typeof(flag)=='Error'){
			callback(false);
		}else if(!flag){
			callback()
		}
	});
};

//카카오유저 가입여부 확인
exports.kakaoMemberCheck = function(udata, callback){
	memberModel.findOne({kid:udata.id}, {_id:1}).exec(function (err, kuser){
		if(err){
			var errmsg = 'kakao membercheck err';
			console.log('kakao membercheck err', err);
			callback(false);
		}else if(kuser == null){
			callback(true);
		}else{
			console.log('kakao membercheck statue', kuser);
			callback(false);
		}
	});
};

//카카오유저 가입
//가입 성공시 callback으로 회원정보문서 넘겨줌
var kakaoMemberJoin = function(udata, callback){
	var kakaoUser = new memberModel({
		kid : udata.id,
		name : udata.name,
		k_nickname: udata.nickname,
		email: udata.email,
		joinpath: 'k',
		profileImg : udata.profileImg,
		regdate : Date.now(),
		pushKey : udata.pushKey,
		belongto : udata.belongto
	});

	kakaoUser.save(function (err, info){
		if(err){
			var errmsg = 'mongo kakaojoin save err';
			console.log('mongo kakaojoin save err', err);
			if(info._id){
				callback(err, errmsg);
			}else{
				callback(err, errmsg);
			}
		}else{
			callback(null, info);
		}
	});
};

//카카오유저 알림스키마 생성
//callback으로 회원가입문서 넘겨줌
var kakaoCreateNoticePack = function(udata, callback){
	var mNoticeSchema = new notiModel({
		user_email : udata.email,
		user_id : udata._id
	});

	mNoticeSchema.save(function (err, sinfo){
		if(err){
			var errmsg = 'mongo kakaojoin notice save err';
			console.log('mongo kakaojoin notice save err', err);
			callback(err, errmsg);
		}else{
			callback(null, udata);
		}
	});
};

//카카오톡 회원가입/로그인
exports.kakaologin = function(data, waterCallback){
	var udata = data;

	async.waterfall([
		function(callback){
			kakaoMemberJoin(data, callback);
		},
		function(data, callback){
			if(typeof(data) == 'string'){
				callback('Error', false);
			}else{
				kakaoCreateNoticePack(data, callback);
			}
		}
	], function(err, result){
		if(err){
			waterCallback(false);
		}else{
			console.log('final');
			waterCallback(result);
		}
	});

	var rollback = function(objid, callback){

	};
};

//로그아웃
exports.logout = function(data, callback){
	var mail = data;
	memberModel.findOne({email:mail}).select('email').exec(function (err, row){
		var success = false;
		if(err){
			console.log('mongo logout', err);
			callback(success);
		}else if(!row){
			console.log('mongo logout', row);
			callback(success);
		}else{
			console.log('mongo logout', row);
			callback(row);
		}
	});
};

//회원가입 이미 가입되있는지 중복 체크
var mCheck = function (datas, callback){
	memberModel.findOne({email:datas.email}).select('email').select('_id').exec(function (err, info){
		//console.log(info);
		if(err){
			console.log('mongo join:err', err);
			callback(err.toString());
		}else if(info == null){
			//console.log('mongo join:gogo', info);
			callback(null, datas);
		}else if(info.email == datas.email){
			//console.log('mongo join:already member');
			callback(null, false);
		}
	});
};

//비밀번호 암호화
var pwCrypto = function(datas, callback){
	cryptoMethod.cryptoPassword(datas.pw, function(cryptoObj){
		datas.pw = cryptoObj.cryp_pass2;
		datas.salt = cryptoObj.userSalt;
		console.log('test crypto', datas);
		callback(null, datas);
	});
};

//회원가입 : 회원 스키마 생성
var joinSave = function(datas, callback){
	var dProfilePath = path.join(__dirname, '../public/profile', 'profile_null_ic.png');
	var date = moment(new Date()).format('YYYY-MM-DD@hh-mm-ss');
	var nProfilepath = datas.email+'-profile-'+ date +'.png';
	fs.createReadStream(dProfilePath).pipe(fs.createWriteStream(path.join(__dirname,'../public/profile', nProfilepath)));
	var joinMember = new memberModel({
		email: datas.email,
		name: datas.name,
		password: datas.pw,
		salt : datas.salt,
		joinpath: 'm',
		regdate: Date.now(),
		pushKey: datas.pushKey,
		profileImg: '/profile/' + nProfilepath
	});
	console.log('mongo user join', joinMember);

	joinMember.save(function(err, info){
		if(err){
			callback(err);
		}else{
			//console.log('mongo joinSave save', info);
			callback(null, info);
		}
	});
};
//회원가입 : 회원의 알림 스키마 생성
var makeNoticePack = function(uobj, callback){
	var mNoticeSchema = new notiModel({
		user_email : uobj.email,
		user_id : uobj._id
	});

	mNoticeSchema.save(function (err, row){
		if(err){
			console.log('mongo notisave err', err);
			callback(err);
		}else{
			console.log('mongo notisave success', row);
			callback(true);
		}
	});
};

exports.join = function(datas, callback){
	//저장 수행
	async.waterfall([
		function(callback){
			mCheck(datas, callback);
		},
		function(datas, callback){
			pwCrypto(datas, callback);
		},
		function(datas, callback){
			if(!datas){
				callback(null, false);
			}else{
				joinSave(datas, callback);
			}
		},
		function(info, callback){
			if(!info){
				callback(false);
			}else{
				makeNoticePack(info, callback);
			}
		}
	], function(flag){
		if(flag){
			callback(true);
		}else if(!flag || typeof(flag)=='err'){
			callback(false);
		}
	});
}

//회원탈퇴(탈퇴사유 수집, 15일간 재가입 불가능)
exports.withdraw = function(data, callback){
	var mail = data;
	memberModel.where({email:mail}).update({$set:{delyn:'Y'}}, function (err, row){
		if(err){
			//쿼리에러
			console.log('mongo withdraw error', err);
			callback(err);
		}else if(row){
			console.log('mongo withdraw', row);
			callback(true);
		}
	});
}

//프로필 이미지 수정
exports.profileimgmod = function(data, callback){
	memberModel.findOne({email:data}).select('profileImg').exec(function (err, infos){
		if(err){
			console.log('mongo profileimg err', err);
			callback(false);
		}else if(infos == null){
			console.log('mongo profileimg null', infos);
			callback(false);
		}else if(infos.profileImg.length){
			console.log('mongo profileimg callback', infos);
			callback(infos);
		}
	});
};

//프로필수정(프로필이미지, 이름, 소속)
exports.profilemod = function(data, callback){
	var update = {};
	console.log('mongo modprofile file', data);
	update.profileImg = data.imgnamePath;
	update.name = data.mName;
	update.belongto = data.mBelongto;
	console.log('mongo update obj', update.profileImg);
	var options = {new:true};
	memberModel.findOneAndUpdate({email:data.usermail}, update, options).select('-password').select('-fbid').exec(function (err, infos){
		if(err){
			console.log('mongo profile err', err);
			callback(false);
		}else if(infos == null){
			console.log('mongo profile not found');
			callback(false);
		}else if(infos.email.length){
			console.log('mongo profile info', infos);
			callback(infos);
		}
	});
};
//프로필수정(프로필 이미지는 변경하지 않는 경우)
exports.noimgProfilemod = function(data, callback){
	var update = {
		name:data.mName,
		belongto:data.mBelongto
	};
	var options = {new:true};
	console.log('noimgProfilemod update obj', update);
	memberModel.findOneAndUpdate({email:data.usermail}, update, options).select('-password').select('-fbid').exec(function (err, infos){
		if(err){
			console.log('mongo profile err', err);
			callback(false);
		}else if(infos == null){
			console.log('mongo profile not found');
			callback(false);
		}else if(infos.email.length){
			console.log('mongo profile info', infos);
			callback(infos);
		}
	});
};

//프로필수정(비밀번호 변경) - 이메일, 비밀번호, 새 비밀번호
exports.modPassword = function(datas, callback){
	console.log('mongo modPass', datas);

	memberModel.findOne({email:datas.email}).select('password').select('salt').exec(function (err, uinfo){
		if(err){
			console.log('mongo modPassword find member err', err);
			callback(false);
		}else{
			cryptoMethod.pwCheck(uinfo.password, uinfo.salt, function(cryptoObj){
				if(uinfo.password == cryptoObj.cryp_pass2){
					cryptoMethod.cryptoPassword(datas.newPw, function(cryptoObj){
						var update = {
							password:cryptoObj.cryp_pass2,
							salt:cryptoObj.userSalt
						};
						var options = {new : true};

						memberModel.findOneAndUpdate({email:datas.email, password:datas.currentPw, joinpath:'m'}, update, options).select('-salt').select('-password').exec(function (err, infos){
							if(err){
								console.log('mongo modpw err', err);
								callback(false);
							}else if(infos == null){
								console.log('mongo modpw not found');
								callback(false);
							}else if(infos.email.length){
								callback(true);
							}
						});//query
					});//crypto
				}else{
					console.log('mongo modpw unAuth access');
					callback(false);
				}
			});
		}
	});
}

//관심카테고리 수정(최소 3개 최대 7개)
exports.category = function(datas, callback){
	console.log('mongo category', datas.category);
	memberModel.update({email:datas.email}, {$set:{likeCategory:datas.category}}, function(err, flag){
		if(err){
			console.log('mongo category err', err);
			callback(err);
		}else if(flag==1){
			console.log('mongo category success flag 1');
			callback(true);
		}else if(flag==0){
			console.log('mongo category flag 0');
			callback(false);
		}
	});
}

//히스토리 마이페이지
exports.history = function(data, callback){
	var mail = data;
	//var mQuery = Member.findOne({email:mail}).select('_history');
	memberModel.findOne({email:mail}).select('_history').populate('_history', {}).exec(function (err, docs){
		console.log('mquery', docs);
		var options = {
			path: '_history._creator',
			model: 'Member',
			select: {_id:1, email:1, name:1, profileImg:1, likeCategory:1, belongto:1}
		};
		//mQuery.where('_history').populate('_history').exec(function (err, rows){
		memberModel.populate(docs, options, function (err, rows){
			if(err){
				console.log('mongo history err', err);
				callback(err);
			}else if(rows){
				//console.log('mongo history success', rows);
				callback(rows);
			}
		});
	});
};

//작성한 카드 마이페이지
exports.writenCards = function(data, callback){
	memberModel.findOne({email:data}).select('_makeCards').populate('_makeCards', {}).exec(function (err, docs){
		console.log('mquery', docs);
		var options = {
			path: '_makeCards._creator',
			model: 'Member',
			select: {_id:1, email:1, name:1, belongto:1, profileImg:1}
		};
		//mQuery.where('_history').populate('_history').exec(function (err, rows){
		memberModel.populate(docs, options, function (err, rows){
			if(err){
				console.log('mongo writenCards err', err);
				callback(err);
			}else if(rows){
				//console.log('mongo writenCards success', rows);
				callback(rows);
			}
		});
	});
};

//저장한 카드 마이페이지
exports.savedCards = function(data, callback){
	memberModel.findOne({email:data}).select('_savedCards').populate('_savedCards', {}).exec(function (err, docs){
		console.log('mquery', docs);
		var options = {
			path: '_savedCards._creator',
			model: 'Member',
			select: {_id:1, email:1, name:1, belongto:1, profileImg:1}
		};
		//mQuery.where('_history').populate('_history').exec(function (err, rows){
		memberModel.populate(docs, options, function (err, rows){
			if(err){
				console.log('mongo savedCards err', err);
				callback(err);
			}else if(rows){
				callback(rows);
			}
		});
	});
};

//나를 팔로우하고 있는 사람들 목록 가져오기
exports.myFollower = function(data, callback){
	var mail = data;
	memberModel.findOne({email:mail}).select('email').select('name').select('_follower')
	.populate('_follower', {'email':1, 'name':1, 'belongto':1, 'profileImg':1, 'likeCategory':1, '_id':1})
	.exec(function (err, rows){
		if(err){
			console.log('mongo:follower',err);
			callback(err);
		}else if(rows){
			//console.log('monto:follower info success', rows);
			callback(rows);
		}else{
			callback(false);
		}
	});
};

//내가 팔로잉하고 있는 사람들 목록 가져오기
exports.myFollowing = function(data, callback){
	var mail = data;
	memberModel.findOne({email:mail}).select('email').select('name').select('_following')
	.populate('_following', {'email':1, 'name':1, 'belongto':1, 'profileImg':1, 'likeCategory':1, '_id':1})
	.exec(function (err, rows){
		if(err){
			console.log('mongo:following',err);
			callback(err);
		}else if(rows){
			//console.log('monto:following info success', rows);
			callback(rows);
		}else{
			callback(false);
		}
	});
};

//다른사람을 팔로잉하는 내 정보 가져오기
//fobj:입력파라미터
var getMyInfo = function(fobj, callback){
	console.log('getMyInfo', fobj);
	memberModel.findOne({email:fobj.mymail}).select('_id').select('email').select('name').select('likeCategory').exec(function (err, myinfo){
		if(err){
			console.log('mongo:follow',err);
			callback(err);
		}else if(myinfo){
			callback(null, fobj, myinfo);
		}
	});
};
//가져온 내 정보를 팔로우의 _follower에 추가, 팔로우의 정보 가져오기
//fobj:입력파라미터, myinfo:내 정보
var pushFollowing = function(fobj, myinfo, callback){
	console.log('getMyInfo', fobj);
	if(fobj.fmail == myinfo.email){
		console.log('push following: Do not follow me');
		callback(null, false);
	}
	memberModel.findOneAndUpdate({email:fobj.fmail}, {$addToSet:{_follower:myinfo}}).select('_id').select('email').select('name').select('likeCategory').exec(function (err, finfo){
		if(err){
			console.log('mongo pushfollowing err', err);
		}else if(finfo){
		//팔로우의 팔로잉목록에 등록 성공
			callback(null, fobj, finfo, myinfo);
		}
	});
};

//가져온 팔로우의 정보를 나의 _following에 추가
//fobj:입력파라미터, finfo:상대방 정보
var pushFollower = function(fobj, finfo, myinfo, callback){
	console.log('pushFollower finfo', finfo);
	console.log('pushFollower fobj.mymail', fobj.mymail);
	memberModel.findOneAndUpdate({email:fobj.mymail}, {$addToSet:{_following:finfo}}).select('_id').select('email').select('name').select('likeCategory').exec(function (err, infos){
		if(err){
			console.log('mongo pushfollower err', err);
			// return false;
			callback(null, false);
		}else if(infos){
		//팔로우의 팔로잉목록에 등록 성공
			console.log('mongo pushfollower success');
			//callback(infos);
			callback(null, fobj, finfo, myinfo);
		}else{
		//팔로우의 팔로잉목록에 등록 실패
			// return false;
			callback(null, false);
		}
	})
};

//params:입력파라미터, news:댓글이 달린 뉴스, info:댓글 작성자정보
var pushFollowNoti = function(params, finfo, myinfo, callback){
	if(params.mymail == myinfo.email){  //혹시 내가 나를 팔로우한경우
		callback(true);
	}else{
		var newFollowNoti = {
			message : 6,
			destination : myinfo.name,
			sender : myinfo._id
		};
		notipush.userFollower(finfo, newFollowNoti, function(flag){
			callback(flag);
		});
	}
};

//팔로우하기팔로우버튼을 누를 때
exports.follow = function(params, callback){
	console.log('start follow', params);
	async.waterfall([
		function(callback){
			getMyInfo(params, callback);
		},
		function(params, myinfos, callback){
			if(!params){
				callback(false);
			}
			pushFollowing(params, myinfos, callback);
		},
		function(params, finfo, myinfos, callback){
			pushFollower(params, finfo, myinfos, callback);
		},
		function(params, finfo, myinfos, callback){
			if(!params) callback(false);
			pushFollowNoti(params, finfo, myinfos, callback);
		}
	], function(infos){
			//if(err) console.log('err', err);
			if(infos){
				console.log('waterfall',infos);
				callback(true);
			}else if(!infos){
				console.log('waterfall', infos);
				callback(false);
			}else{
				console.log('waterfall', infos);
				callback(false);
			}
		}
	);
};

//취소하는 사람의 id를 제거하고 내 정보 가져오기
var getMyinfoAndPull = function(fobj, callback){
	memberModel.findOneAndUpdate({email:fobj.mymail}, {$pull:{'_following':fobj.f_id}}).select('_id').exec(function (err, info){
		if(err){
			console.log('mongo fcancel err', err);
			callback(false);
		}else{
			callback(null, fobj, info);
		}
	});
};

//팔로우의 _follower목록에서 나를 제거
var pullMyinfo = function(fobj, myobj, callback){
	memberModel.findOneAndUpdate({email:fobj.fmail}, {$pull:{'_follower':myobj._id}}).select('email').exec(function (err, info){
		if(err){
			console.log('mongo fcancel err', err);
			callback(false);
		}else{
			callback(info);
		}
	});
};

//팔로우 취소하기
exports.fcancel = function(datas, callback){
	console.log('cancel follow' ,datas.f_id);

	async.waterfall([
		function(callback){
			getMyinfoAndPull(datas, callback);
		},
		function(fobj, info, callback){
			pullMyinfo(fobj, info, callback);
		}
	], function(test){
		if(test==false){
			callback(false);
		}else if(test){
			callback(true);
		}
	});

};

//사용자 검색
exports.searchUser = function (data, callback){
	memberModel.find({name:data}, {password:0, _history:0}).exec(function (err, infos){
		if(err){
			console.log('mongo:searchUser err', err);
			callback(false);
		}else{
			callback(infos);
		}
	});
};

//알림 목록 가져오기
exports.getNotice = function (data, callback){
	notiModel.where({user_email:data}, {_noti:1})
	.populate('_noti').sort('_noti.regdate').slice('_noti', 50)
	.exec(function (err, infos){
		if(err){
			console.log('mongo:searchUser err', err);
			callback(false);
		}else{
			var options = {
				path:'_noti.sender',
				model:'Member',
				select:{_id:1, email:1, name:1, profileImg:1}
			};
			var options2 = {
				path:'_noti.destination',
				model:'NewsCard',
				select:{_id:1, uTitle:1, nTitle:1}
			}
			console.log('what the notice');
			notiModel.populate(infos, options, function(err, mynoti){
				console.log('mynoti : ', mynoti);
				notiModel.populate(mynoti, options2, function(err, getmynoti){
					//console.log('getMynoti : ', getmynoti);
					console.log('destination : ', getmynoti[0]._noti[0].sender);
					callback(getmynoti);
				});
			});
		}
	});
};

//회원추천목록보여주기
/*exports.recommendUser = function()*/

/*exports.update1 = function (datas, outCallback){
	async.each(datas.emails, function(user, callback){
		memberModel.findOne({email:user}).exec(function (err, test){
			cryptoMethod.cryptoPassword(test.password, function(cryptoObj){
				var update = {
					password:cryptoObj.cryp_pass2,
					salt:cryptoObj.userSalt
				};
				memberModel.findOneAndUpdate({email:user}, update, {multi:true}).exec(function (err, test2){
					callback(null, test2);
				});
			});
		});
	}, function(err, error){
		outCallback(test2)
	});

};*/
