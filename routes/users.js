var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var crypto = require('crypto');
var async =require('async');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var redis = require('redis');
var moment = require('moment');
//var mongoconn = require('../models/mongoconn');
var mongoconn = require('../models/mongouser');
//var fb = require('../models/facebook');
var fb = require('../facebook/facebook');
var profile = require('../models/profile');
var kakao = require('../kakao/kakaologin');
var client = redis.createClient();

//페이스북 계정으로 회원가입 시도-ok
router.post('/facebooklogin', function (req,res){
	var token = req.body.token;

	fb.fblogin(token, function(infos){
		if(infos==false){
			console.log('user fblogin false', infos);
			res.json({success:'fail', result:'사용자를 찾을 수 없습니다.'});
		}else if(infos.email == undefined){
			mongoconn.fbUseralready(infos.id, function(check){
				if(typeof(check) == 'Error'){
					console.log('user fblogin already check err', err);
					res.json({success:'fail', result:[], message:'err'});
				}else if(check == false){
					console.log('user fblogin already check ', check);
					//res.json({success:'ok', result:[], message:'no member'});
					var userToken = {
						fbtoken : token
					};
					req.session.userSet = userToken;
					console.log('user fblogin session', req.session.userSet);
					res.json({success:'ok', result:{}, message:"email"});
				}else if(check._id){
					console.log('user fblogin already check ', check);
					if(check.likeCategory == 0){
						res.json({success:'ok', result:check, message:'category'});
					}else{
						res.json({success:'ok', result:check, message:'registed'});
					}
				}
			});

		}else if(infos.email){
			mongoconn.fbJoin(infos, function(flag){
				if(typeof(flag)=='Error'){
					res.json({success:'fail', result:flag});
				}else if(flag){
					var userToken = {
						id : infos.id,
						name : infos.name,
						email : infos.email
					};
					req.session.userSet = userToken;
					console.log('fblogin test flag', flag);
					res.json({success:'ok', result:flag});
				}else if(flag==false){
					var userToken = {
						id : infos.id,
						name : infos.name,
						email : infos.email
					};
					req.session.userSet = userToken;
					console.log('fblogin test flag==false', flag);
					res.json({success:'ok', result:flag});
				}
			});
		}
	});
});

//페이스북 계정으로 회원가입 : 이메일 직접 입력-ok
router.post('/facebookemail', function (req,res){
	var params = {
		email : req.body.email,
		pushKey : req.body.pushKey,
		token : req.session.userSet.fbtoken
	};
	console.log('fbemail params', params);
	fb.fbemail(params, function(infos){
		if(infos==false){
			console.log('user fblogin false', infos);

			req.session.destroy(function(err){
				if(err){
					console.error('user facebookemail session d err', err);
					res.json({success:'fail', result:{}, message:'fail session d'});
				}else{
					console.error('user already facebookemail session d ',infos);
					res.json({success:'fail', result:{}, message:'fail logout'});
				}
			});

		}else if(infos.email){
			mongoconn.fbJoin(infos, function(flag){
				if(typeof(flag)=='Error'){
					res.json({success:'fail', result:"error"});
				}else if(flag == true){
					var userToken = {
						id : infos.id,
						name : infos.name,
						email : infos.email
					};
					req.session.userSet = userToken;
					res.json({success:'ok', result:flag, message:'ok'});
				}else if(flag==false){
					res.json({success:'fail', result:flag, message:"retry"});
				}
			});
		}
	});
});

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});

router.post('/recommend', function (req, res){
	var category = req.body.category;
	//mongoconn.
});

//마이페이지 -ok
router.post('/mypage', function (req, res){
	if(req.body.email === undefined){
		res.json({success:'fail', result:'Do not send email'});
		return false;
	}
	var mail = req.body.email;
	console.log('users mypage: mail', mail)
	//mongoconn method call
	mongoconn.mypage(mail, function(data){
		if(data){
			res.json({success:'ok', result:data});
			//get datas are null
		}else if(!data){
			console.log('users mypage error');
			res.json({success:'fail'});
		}
	});
});

//다른 회원의 mypage보기
router.post('/userpage', function (req, res){
	console.log('users userpage req.body', req.body);
	if(req.body.email === undefined){
		res.json({success:'fail', result:'Do not send email'});
		return false;
	}
	var mail = req.body.email;
	mongoconn.userpage(mail, function(data){
		if(data){
			//get datas
			res.json({success:'ok', result:data});
			//get datas are null
		}else if(!data){
			console.log('users mypage error');
			res.json({success:'fail'});
		}
	});
});

//마이페이지 수정(프로필사진, 이름, 소속)
router.post('/modProfile', function (req, res){
	console.log('users modMypage req.body', req.body);
	//console.log('req.files', req.files);
	var date = moment(new Date()).format('YYYY-MM-DD@hh-mm-ss');
	var mail = req.body.email; //프로필 변경하려는 사람의 이메일
	var name = req.body.name;
	var belongto = req.body.belongto;
	var newImgfile = req.files.hello; //새로 업로드한 프로필사진
	console.log('user newimg path', newImgfile);
	if(newImgfile === undefined){
		var param = {
			usermail : req.body.email, //회원 email
			mName : req.body.name,
			mBelongto : req.body.belongto
		}

		mongoconn.noimgProfilemod(param, function(data){
			if(data == false){
				res.json({success:'fail', result:{}, message:'fail' });
			}else if(data){
				res.json({success:'ok', result:data, message:'ok' });
			}
		});
	}else if(newImgfile){
		var idx = newImgfile.originalname.lastIndexOf('.'); //파일이름
		var imgnamePath = '/profile/' +mail + '-profile-' + date + '.' + newImgfile.extension; //파일 경로
		var newpath = path.join(__dirname, '../public', imgnamePath); //새 경로
		console.log('users newpath', newpath);


		var imgfile = {
			usermail : req.body.email, //회원 email
			mName : req.body.name,
			mBelongto : req.body.belongto,
			upfilePath : req.files.hello.path,
			imgnamePath : imgnamePath,
			newpath : newpath
		}

		//DB에 저장된 현재 이미지를 가져옴.
		var getCurrentImg = function(imgfile, callback){
			console.log('test', imgfile.usermail);
			mongoconn.profileimgmod(imgfile.usermail, function(data){
				if(data==false){
					callback(null, imgfile);
				}else if(data.profileImg.length){
					console.log('1. user getCurrentImg', data);
	//				deleteCurrentImg(data.profileImg);
					imgfile.beforeImgfile = data.profileImg;
					console.log('2. user getCurrentImg init path', imgfile.beforeImgfile);
					callback(null, imgfile);
				}
			});
		};
		//원래 프로필 이미지가 있는지 확인하고 있으면 삭제
		var delcurrentImg = function(imgfile, callback){
		//db에서 가져온 경로로 현재 이미지파일의 경로 합성
			var currentImgpath = path.join(__dirname, '../public', imgfile.beforeImgfile);
			console.log('3. user delcurrentImg path', currentImgpath);
			fs.exists(currentImgpath, function(flag){
				if(!flag){
					console.log('user delcurrentImg exists err', flag);
					callback(null, imgfile);
				}else if(flag){
					console.log('5. user delcurrentImg exists');
					fs.unlink(currentImgpath, function(err){
						if(err){
							console.log('user delcurrentImg unlink err', err);
							callback(null, err);
						}else{
							//res.json({success:'ok', result:null});
							console.log('6. user delcurrentImg unlink ok');
							callback(null, imgfile);
						}
					});
				}
			});
		};

		//새로 업로드된 이름을 프로필사진 이름으로 변경
		var renameAndupload = function(imgfile, callback){
			console.log('rename upload file path', imgfile.upfilePath);
			console.log('rename new file path', imgfile.newpath);
			fs.rename(imgfile.upfilePath, imgfile.newpath, function(err){
				if(err){
					console.log('user renameAndupload err', err);
					callback(err);
				}else{
					console.log('7. user renameAndupload ok');
					mongoconn.profilemod(imgfile, function(data){
						if(data){
							console.log('user upload ok', data);
							callback(data);
						}else if(data==false){
							callback(false);
						}
					});
				}
			});
		};

		async.waterfall([
			function(callback){
				getCurrentImg(imgfile, callback);
			},
			function(imgfile, callback){
				if(imgfile.beforeImgfile==0){
					callback(null, imgfile);
				}
				delcurrentImg(imgfile, callback);
			},
			function(imgfile, callback){
				renameAndupload(imgfile, callback);
			}
		], function(data){
			if(data == false){
				res.json({success:'fail', result:'db fail'});
			}else if(data){
				res.json({success:'ok', result:data});
			}
		});
	}
});

//비밀번호 수정(소셜계정 불가능) -ok
router.post('/modPassword', function (req, res){
	var params = {
		email : req.body.email,
		currentPw : req.body.cpw,
		newPw : req.body.npw
	};
	mongoconn.modPassword(params, function(flag){
		if(typeof(data)=='err'){
			console.log('users modpw err');
			res.json({success:'fail', result:'retry'});
		}else if(flag == false){
			console.log('user modpw fail');
			res.json({success:'fail', result:'not mached pw or not found'});
		}else if(flag == true){
			//req.session.destroy;
			console.log('users modpw success')
			res.json({success:'ok', result:null});
		}
	});
});

//관심 카테고리 설정
router.post('/category', function (req, res){
	var category = req.body.category;
	console.log('category array', req.body.category);

	if(category.length < 3){
		res.json({success:'fail', result:'more'});
		return false;
	}

	var params = {
		email : req.body.email,
		category : req.body.category
	};

	mongoconn.category(params, function(flag){
		if(typeof(flag)=='err'){
			console.log('user category err', err);
			res.json({success:'fail', result:'error'});
		}else if(flag){
			console.log('user category success');
			res.json({success:'ok', result:null});
		}else if(flag==0){
			res.json({success:'fail', result:null});
		}
	});
});

//로그인 -ok
router.post('/login', function (req, res){
	//로그인 상태인지 확인
	if(req.session.userSet === undefined){
		var params = {
			email:req.body.email,
			pw:req.body.pw
		};

		mongoconn.login(params, function(data){
			if(data){
				//get datas : email
				var userToken = {
					name : data.name,
					email : data.email
				};
				req.session.userSet = userToken;
				console.log('users login session', req.session.userSet.email);
				res.json({success:'ok', result:data});
				//get datas are null
			}else if(!data){
				console.log('users login error');
				res.json({success:'fail'});
			}
		});
	}else if(req.session.userSet.email == req.body.email){
		console.log('userlogin', req.body.email);
		var params = {
			email:req.session.userSet.email,
			pw:req.body.pw
		};

		mongoconn.login(params, function(data){
			if(data){
				//get datas : email
				console.log('users login', data);
				console.log('users login session', req.session.userSet.email);
				res.json({success:'ok', result:data});
				//get datas are null
			}else if(!data){
				console.log('users login error');
				res.json({success:'fail'});
			}
		});
	}
});

//로그아웃 : 세션처리 수정 필요 -ok
router.post('/logout', function (req, res){
	console.log('user logout param email', req.body.email);
	if(req.session.userSet == undefined){
		console.log('logout session userSet undefined');
		res.json({success:'fail'});
	}else if(req.session.userSet.email == req.body.email){
		console.log('before session', req.session.userSet.email);
		//레디스 세션 제거
		req.session.destroy(function(err){
			if(err){
				console.error('user facebookemail session d err', err);
				res.json({success:'fail'});
			}else{
				console.log('user already facebookemail session d ')
				res.json({success:"ok"});
			}
		});
	}
});

//회원탈퇴 : 세션처리 수정 필요 (15일동안 재가입 불가능) -ok
router.post('/withdraw', function (req, res){
	var mail = req.body.email;
		mongoconn.withdraw(mail, function (data){
			if(typeof(data)=='err'){
				console.log('users withdraw err');
				res.json({success:'fail', result:'다시 시도해주세요'});
			}else if(true){
				//req.session.destroy;
				if(req.session.userSet.email == req.body.email){
					console.log('before session', req.session.userSet.email);
					//레디스 세션 제거
					req.session.destroy(function(err){
						if(err){
							console.error('user withdraw session d err', err);
							res.json({success:'fail', result:'fail session d'});
						}else{
							console.log('user already withdraw session d ')
							res.json({success:"ok", result:null});
						}
					});
				}
			}
		});
});

//회원가입 -ok
router.post('/join', function (req, res){
	if(req.body.email == null || req.body.name == null || req.body.pw == null){
		res.json({success:'fail', result:'parameter null'});
		return false;
	}

	var params = {
		email : req.body.email,
		name : req.body.name,
		pw : req.body.pw,
		pushKey: req.body.pushKey
	};
	mongoconn.join(params, function(data){
		if(data.length>1){
			res.json({success:'fail', result:'error'});
			return false;
		}else if(data==false){
			res.json({success:'fail', result:'이미 가입되어있는 이메일입니다.'});
		}else if(data==true){
			res.json({success:'ok', result:null});
		}else if(typeof(data) == 'err'){
			console.log('users join true', data);
			res.json({success:'fail', result:'fail'});
		}
	});
});

//읽은 뉴스 히스토리 보기 -ok
router.post('/history', function (req, res){
	if(req.body.email==null){
		console.log('user history err : bad parameter');
		res.json({success:'fail', result:'bad parameter'});
		return false;
	}
	if(req.body.email.length > 1){
		var mail = req.body.email;
		console.log('user history parameter get');
		mongoconn.history(mail, function(datas){
			if(typeof(datas) == 'err'){
				console.log('user history query error');
				res.json({success:'fail', result:'error'});
				return false;
			}else if(datas == false){
				res.json({success:'fail', result:'Not member'});
			}else if(datas){
				console.log('user history success');
				res.json({success:'ok', result:datas});
			}
		});
	}
});

//팔로우 목록 가져오기
router.post('/myfollower', function (req, res){
	if(req.body.email==null){
		console.log('user myfollower err : bad parameter');
		res.json({success:'fail', result:'bad parameter'});
		return false;
	}
	if(req.body.email.length > 1){
		var mail = req.body.email;
		console.log('user myfollower parameter get');
		mongoconn.myFollower(mail, function(datas){
			if(typeof(datas) == 'err'){
				console.log('user myfollower query error');
				res.json({success:'fail', result:'error'});
				return false;
			}else if(datas == false){
				res.json({success:'fail', result:'Not member'});
			}else if(datas){
				console.log('user myfollower success');
				res.json({success:'ok', result:datas});
			}
		});
	}
});

//팔로잉 목록 가져오기
router.post('/myfollowing', function (req, res){
	if(req.body.email==null){
		console.log('user myfollowing err : bad parameter');
		res.json({success:'fail', result:'bad parameter'});
		return false;
	}
	if(req.body.email.length > 1){
		var mail = req.body.email;
		console.log('user myfollowing parameter get');
		mongoconn.myFollowing(mail, function(datas){
			if(typeof(datas) == 'err'){
				console.log('user myfollowing query error');
				res.json({success:'fail', result:'error'});
				return false;
			}else if(datas == false){
				res.json({success:'fail', result:'Not member'});
			}else if(datas){
				console.log('user myfollowing success');
				res.json({success:'ok', result:datas});
			}
		});
	}
});

//내가 다른 사용자를 팔로잉하기
router.post('/follower', function (req, res){
	var followTime = Date.now();

	var params = {
		mymail : req.body.email,
		fmail : req.body.fEmail,
		//fname : req.body.followerName,
		ftime : followTime
	};
	console.log('user follower params', params);
	mongoconn.follow(params, function(flag){
		console.log( 'users follower test', flag);
		if(typeof(flag)=='err'){
			res.json({success:'fail', result:"실패"});
		}else if(flag==true){
			console.log('user true', flag);
			res.json({success:'ok', result:null});
		}else if(flag==false){
			console.log('user false', flag);
			res.json({success:'fail', result:'fail'});
		}
	});
});

//팔로우 취소하기
router.post('/cancelFollow', function (req, res){
	var followTime = Date.now();
	console.log('user cancelFollow fEmail', req.body.fEmail);
	if(req.body.email == req.body.fEmail){
		res.json({success:'fail', result:{}, message:'bad parameter'});
	}
	var params = {
		mymail : req.body.email,
		fmail : req.body.fEmail,
		f_id : req.body.f_id,
		ftime : followTime
	};
	console.log('user follower params', params);
	mongoconn.fcancel(params, function(flag){
		if(typeof(flag)=='err'){
			res.json({success:'fail', result:{}, message:'err'});
		}else if(flag==true){
			console.log('user true', flag);
			res.json({success:'ok', result:{}, message:null});
		}else if(flag==false){
			console.log('user false', flag);
			res.json({success:'fail', result:{}, message:'fail'});
		}else{
			console.log('user else', flag);
			res.json({result:flag});
		}
	});

});

//사용자 검색
router.post('/searchUser', function (req, res){
	mongoconn.searchUser(req.body.name, function(infos){
		if(infos == false){
			res.json({success:'fail', result:[], message:'fail'});
		}else{
			res.json({success:'ok', result:infos, message:'ok'});
		}
	});
	//res.send({success:'ok', result:'update'});
});

//내가 작성한 뉴스카드 목록
router.post('/writenCards', function (req, res){
	if(req.body.email==null){
		console.log('userr writenCards err : bad parameter');
		res.json({success:'fail', result:'bad parameter'});
		return false;
	}
	if(req.body.email.length > 1){
		var mail = req.body.email;
		console.log('user writenCards parameter get');
		mongoconn.writenCards(mail, function(datas){
			if(typeof(datas) == 'err'){
				console.log('user writenCards query error');
				res.json({success:'fail', result:'error'});
				return false;
			}else if(datas == false){
				res.json({success:'fail', result:'Not member'});
			}else if(datas){
				console.log('user writenCards success');
				res.json({success:'ok', result:datas});
			}
		});
	}
});

//내가 저장한 뉴스카드 목록
router.post('/savedCards', function (req, res){
	if(req.body.email==null){
		console.log('userr savedCards err : bad parameter');
		res.json({success:'fail', result:'bad parameter'});
		return false;
	}
	if(req.body.email.length > 1){
		var mail = req.body.email;
		console.log('user savedCards parameter get');
		mongoconn.savedCards(mail, function(datas){
			if(typeof(datas) == 'err'){
				console.log('user savedCards query error');
				res.json({success:'fail', result:'error'});
				return false;
			}else if(datas == false){
				res.json({success:'fail', result:'Not member'});
			}else if(datas){
				console.log('user savedCards success');
				res.json({success:'ok', result:datas});
			}
		});
	}
});

/*router.post('/getNotice', function (req, res){
	console.log('email : ', req.body.email);
	var email = req.body.email;
	mongoconn.getNotice(email, function(data){
		console.log('data.length : ', data.length);
		if(data.length == 0){
			res.json({success:'fail', result:{}, message:'fail'});
		}else{
			//console.log('users notice : ', data);
			res.json({success:'ok', result:data, message:'ok'});
		}
	});
});*/
router.get('/getNotice/:email', function (req, res){
	console.log('email : ', req.params.email);
	var email = req.params.email;
	mongoconn.getNotice(email, function(data){
		console.log('data.length : ', data.length);
		if(data.length == 0){
			res.json({success:'fail', result:[], message:'fail'});
		}else{
			//console.log('users notice : ', data);
			res.json({success:'ok', result:data, message:'ok'});
		}
	});
});

router.post('/kakao', function (req, res){
	console.log('kakao start');
	console.log('req.body', req.body);
	var datas = {
		token : req.body.token,
		email : req.body.email,
		name : req.body.name,
		belongto : req.body.belongto
	};
	console.log('datas.token : ', datas.token);
	kakao.checkKaKao(datas.token, function(fail, uinfo){
		if(!fail){
			res.json({success:'fail', result:{}, message:'token fail'});
		}else if(fail){
			mongoconn.kakaoMemberCheck(uinfo, function(flag){
				console.log('kakaoMemverCheck : ' , flag);
				if(flag){
					datas.id = uinfo.id;
					datas.nickname = uinfo.nickname;
					datas.profileImg = uinfo.properties.profile_image;
					console.log('kakao login datas', datas);
					mongoconn.kakaologin(datas, function(uinfo){
						console.log('kakao ingo', uinfo);
						res.json({success:'ok', result:uinfo, message:'ok'});
					});
				}else{
					res.json({success:'fail', result:{}, message:'already'});
				}
			});
		}else{
			res.json({success:'fail', result:{}, message:'else'});
		}
	});

});

router.post('/getFbFriend', function (req, res){
	console.log('fb friend list start');
	var data = req.body.token;
	fb.fbfriend(data, function(flist){
		res.json({success:'ok', result:flist});
	});
});

/*router.post('/getTest', function (req, res){
	var email = req.body.email;
	mongoconn.mypagetest(email, function(data){
		res.json({success:'ok', result:data, message:'ok'});
	});
});*/

/*router.post('/updateTest', function (req, res){
	var datas = {
		emails:["jeesunne@mailmail.com"]
	};
	mongoconn.update1(datas, function(test){
		res.json({success:'ok', result:test});
	});
});*/
module.exports = router;
