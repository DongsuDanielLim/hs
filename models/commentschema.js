//commentschema.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var FormatDate = require('mongoose-schema-formatdate');
var memberSchema = require('./memberschema');
var newsModel = require('./newsschema');
var notiModel = require('./notischema');
var notipush = require('./notipush');

//var db = mongoose.connect('mongodb://localhost/tt_member');
/*var uri = 'mongodb://localhost/tt_member';
mongoose.createConnection(uri, {server: {poolSize:10}});*/

var Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

var commentSchema = Schema({
	newsnum : Number,
	_creator : { type:Schema.Types.ObjectId, ref: 'Member' },
	comment : String,
	cRegdate : { type: FormatDate, format: 'YYYY-MM-DD HH:mm:ss', default: Date.now },
	like : [{ type: Schema.Types.ObjectId, ref: 'Member' }]
});

module.exports = mongoose.model('NewsComment', commentSchema);