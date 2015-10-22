//notipush.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var Formatdate = require('mongoose-schema-formatdate');

var Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

var noticeSchema = Schema({
	user_email : String,
	user_id : { type:Schema.Types.ObjectId, ref: 'Member' },
	_noti : [{
		message : Number,
		destination : { type: Schema.Types.Mixed },
		sender : { type:Schema.Types.ObjectId, ref: 'Member' },
		regdate : { type:Formatdate, format:'YYYY-MM-DD HH:mm:ss', default: Date.now },
		readyn : { type:String, default:'N' }
	}],

});

/*var noticeSchema = Schema({
	user_email : String,
	user_id : { type:Schema.Types.ObjectId, ref: 'Member' },
	_noti : [{
		message : Number,
		destination : { type: Schema.Types.ObjectId, ref: 'newsCard' },
		sender : {
			id: {type:Schema.Types.ObjectId, ref: 'Member'},
			email:String,
			name:String,
			profileImg:String
		}
	}],
	push_id : { type:String, default:'0'},
	readyn : { type:String, default:'N' }
});*/

var notice = mongoose.model('Notice', noticeSchema);

module.exports = mongoose.model('Notice', noticeSchema);