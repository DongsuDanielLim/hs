//kakaologin.js
var request = require('request');
var fs = require('fs');

// 프로필 원본 가져오기 해야됨
var download = function(test, callback){
	request.head(test.profileimg, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(test.profileimg).pipe(fs.createWriteStream(test.profilePath)).on('close', function(){
    	callback(test);
    });
  });
};

// 카카오톡 받아오기
exports.checkKaKao = function(data, callback) {
	console.log('checkkakao data : ', data);
    var kakao_token = 'Bearer ' + data;
    var fail = 1;

    var options = {
      url: 'https://kapi.kakao.com/v1/user/me',
      headers: {
        'Authorization': kakao_token
        //'Authorization': admin_key
      }
    };

    request(options, function kakaoCallback(error, response, body) {
      console.log('kakao body : ', body);
      if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
      /* console.log(info);
      console.log(info.id);

       console.log(info.stargazers_count + " Stars");
       console.log(info.forks_count + " Forks");*/
       callback(fail, info);
      }
      else {
        fail = 0;

        var error_info = JSON.parse(body);
        console.log('fail : ', error_info);
        callback(fail, error_info);
      }
  });
};

