//saved.js

//var db = mongoose.connect('mongodb://localhost/tt_member');
/*var uri = 'mongodb://localhost/tt_member';
mongoose.createConnection(uri, {server: {poolSize:10}});*/

var Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

var followInfo = Schema({
	who : { type:Schema.Types.ObjectId, ref: 'Member' }
});

var memoObj = Schema({
	_creator : { type:Schema.Types.ObjectId, ref: 'Member' },
	mContent : String,
	mRegdate : Date
});

var notiConSchema = Schema({
	type : Number,
	destination : { type: Schema.Types.Mixed },
	sender : { type:Schema.Types.Mixed }
});

var followerInfo = mongoose.model('Follower', followInfo);
var memo = mongoose.model('Memo', memoObj);
var noticontent = mongoose.model('Noticontent', notiConSchema);