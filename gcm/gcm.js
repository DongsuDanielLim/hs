var gcm = require('node-gcm');

var addGcmData = function(mType, gcmMessage, pushIds){
	var serverAccessKey = "AIzaSyBH6YzpNJqc6qw-smMmVHQzk8arN-FXIkc";
	var sender = new gcm.Sender(serverAccessKey);
	var registration = [];
	registration.push(pushIds);
	// message.addData('like', pushDatas);
	// message.addData('make', pushDatas);
	// message.addData('reply', pushDatas);
	// message.addData('share', pushDatas);
	// message.addData('messageType', pushDatas);

	gcmMessage.addData('messageType', mType);
	// gcmMessage.addData('sender', pushDatas.sender);
	// gcmMessage.addData('destination', pushDatas.destination);

	sender.send(gcmMessage, registration, function (err, result){
		if(err) console.log('gcm send err', err);
		else console.log('gcm result', result);
		registration.splice(0, registration.length);
	});
};

exports.gcmPush = function (mType, pushIds, pushDatas){
	console.log('messageType', mType);
	var gcmMessage = new gcm.Message({
		timeToLive:1,
		delayWhileIdle:true
	});
	switch(mType){
		case 1:
			console.log('gcm type 1');
			gcmMessage.collapseKey = 'publishCard';
			break;
		case 2:
			console.log('gcm type 2');
			gcmMessage.collapseKey = 'mycardLike';
			break;
		case 3:
			console.log('gcm type 3');
			gcmMessage.collapseKey = 'mycardNewcomment';
			break;
		case 4:
			console.log('gcm type 4');
			gcmMessage.collapseKey = 'mycommentLike';
			break;
		case 5:
			console.log('gcm type 5');
			gcmMessage.collapseKey = 'republishBeyond';
			break;
		case 6:
			console.log('gcm type 6');
			gcmMessage.collapseKey = 'newFollower';
			break;
	}
	//console.log('gcmPush', pushIds);
	//console.log('messageType', pushDatas.messageType);

	console.log('gcm', gcmMessage);

	addGcmData(mType, gcmMessage, pushIds);
};