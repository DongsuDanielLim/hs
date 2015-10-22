var express = require('express');
var router = express.Router();
var gcm = require('node-gcm');

/* GET home page. */
router.get(['/', '/index.html'], function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/join', function (req, res){
	res.render('join', {title:'Join'});
});

router.post('/send', function (req, res){
	var message = new gcm.Message(); //gcm객체 생성

	var sender = new gcm.Sender('');
	console.log('req.body', req.body);

	message.addData('messageType', req.body.message1); //푸쉬 타입 내가 직접 정의
	message.addData('key2', req.body.message2); //다른 타입의 푸쉬

	if(!Array.isArray(pushIds)){
		console.log('배열이 아니다');
		sender.sendNoReply(gcmMessage, [pushIds], function (err, result){
			if(err) console.log('sendNoReply err', err);
			else console.log('result', result);
		});
	}else{
		console.log('배열');
		sender.send(gcmMessage, pushIds, function (err, result){
			if(err) console.log('send err', err);
			else console.log('result', result);
		});
	}

});

module.exports = router;
