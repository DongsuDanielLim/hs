//facebook.js
var fbgraph = require('fbgraph');
var async = require('async');
var request = require('request');
var path = require('path');
var fs = require('fs');

var useremail = 'imagedodwn@test.com';

var download = function(test, callback){
	request.head(test.profileimg, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(test.profileimg).pipe(fs.createWriteStream(test.profilePath)).on('close', function(){
    	callback(test);
    });
  });
};

//사진제외 정보가져오기
/*test:정보를 담을 객체리터럴
getUserInfo안에서는 profileInfo를 test라는 이름으로 씁니다.
callback:다음 수행할 함수리터럴*/
var getUserInfo = function(test, callback){
	fbgraph.get('/me',function(err,res){
	if(err){
			console.error('fb userinfo err',err);
			callback(err);
		}else{
			test.id = res.id; //test객체에 id필드를 만들고 fb id로 초기화
			test.name = res.name; //test객체에 name필드를 만들고 fb name으로 초기화
			test.email = res.email;
			console.log('fb test', test);
			callback(null, test);
		}
	});
};

//사진가져오기
/*test:정보를 담을 객체리터럴
getUserInfo가 성공적으로 수행됐다면 test객체에는 id와 name필드가 있습니다.
getUserProfileimg안에서는 profileInfo를 test라는 이름으로 씁니다.*/
var getUserProfileimg = function(test, callback){
	fbgraph.get('/me?fields=picture',function(err,res){
		if(err){
			console.error('fb profile err',err);
			callback(err);
		}else{
			test.profileimg = res.picture.data.url; //test객체에 profileimg필드를 만들고 fb picture url로 초기화
			test.profilePath = './profile/'+ test.email +'-profile.png';
			callback(null, test);
		}
	});
};

exports.fblogin = function(datas, callback){
	console.log('fb login email', typeof(datas));
	var mail = "";
	var access_token = "";
	if(typeof(datas)=="object"){
		console.log('fb login datas array type');
		mail = datas[0];
		access_token = datas[1];
	}else if(typeof(datas) == "string"){
		console.log('fb login datas string type');
		access_token = datas;
	}

	//console.log('testtesttest', access_token);
	fbgraph.setAccessToken(access_token);
	var profileInfo = {};//fb에서 가져오는 정보를 담아놓을 obj

	/*정보를 담을 객체리터럴과 callback을 파라미터로 함수리터럴을 호출합니다*/
	async.waterfall([
		function(callback){
			getUserInfo(profileInfo, callback);
		},
		function(test, callback){
			getUserProfileimg(test, callback);
		},
		function(test, callback){
			download(test, callback);
		}
	], function(test){
		console.log('waterfall',test); //test : 최종 완성된 profileInfo객체
		console.log('waterfall', test.code);
		if(test.code==190 || test.code==2500){
			console.log('fb callback err');
			callback(false);
		}else if(typeof(test)==undefined){
			console.log('fb callback undefined');
			callback(false);
		}else	if(test){
			console.log('fb callback obj');
			callback(test);
		}
	}
	);
};

//페이스북 계정 가입자가 이메일을 직접 입력했을 때
//이메일 중복 체크 추가해야됨
exports.fbemail = function (datas, callback){
	console.log('fb login email',datas.pushKey);

	fbgraph.setAccessToken(datas.token);
	var profileInfo = {};//fb에서 가져오는 정보를 담아놓을 obj

	/*정보를 담을 객체리터럴과 callback을 파라미터로 함수리터럴을 호출합니다*/
	async.waterfall([
		function(callback){
			getUserInfo(profileInfo, callback);
		},
		function(test, callback){
			if(typeof(test.email) == undefined){
				test.email = datas.email;

			}
			getUserProfileimg(test, callback);
		},
		function(test, callback){
			download(test, callback);
		}
	], function(test){
		console.log('waterfall',test); //test : 최종 완성된 profileInfo객체
		console.log('waterfall', test.code);
		if(test.code==190 || test.code==2500){
			console.log('fb callback err');
			callback(false);
		}else if(typeof(test)==undefined){
			console.log('fb callback undefined');
			callback(false);
		}else	if(test){
			test.email = datas.email;
			test.pushKey = datas.pushKey;
			console.log('fb callback obj', test);
			callback(test);
		}
	}
	);
};

//친구목록 가져오기
exports.fbfriend = function (datas, callback){
	//console.log('fb friendlist datas', datas);
	var access_token = datas;
	fbgraph.setAccessToken(access_token);

	fbgraph.get('/me/friends?fields=installed,id,name,picture',function (err, res){
		if(err){
			console.error('fb friend err',err);
			callback(err);
		}else{
			console.log(res);
			callback(res.data);
		}
	});
};