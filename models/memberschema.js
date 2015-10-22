//memberschema.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var newsModel = require('./newsschema');
var commentModel = require('./commentschema');
var notiModel = require('./notischema');
var notipush = require('./notipush');
var Formatdate = require('mongoose-schema-formatdate');

var Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

var memberSchema = Schema({
	email : String,
	fbid : String,
  kid : String,
  name : String,
  k_nickname : String,
  password : String,
  salt : String,
  profileImg : { type:String},
  regdate : {type:Formatdate, format:'YYYY-MM-DD HH:mm:ss', default: Date.now},
  belongto : { type:String, default:'0'},
  joinpath : String,
  delyn : { type:String, default:'N' },
  noticec : { type:Schema.Types.ObjectId, ref: 'Notice' },
  likeCategory : {type:String, default:'0'},
  pushKey : String,
  _savedCards : [{ type: Schema.Types.ObjectId, ref: 'NewsCard' }],
  _makeCards : [{ type: Schema.Types.ObjectId, ref: 'NewsCard' }],
  _follower : [{ type: Schema.Types.ObjectId, ref:'Member' }],
  _following : [{ type: Schema.Types.ObjectId, ref:'Member' }],
  _history : [{ type: Schema.Types.ObjectId, ref: 'NewsCard' }]
});

module.exports = mongoose.model('Member', memberSchema);
