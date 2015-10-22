//newsschema.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var notiModel = require('./notischema');
var memberModel = require('./memberschema');
var commentModel = require('./commentschema');
var Formatdate = require('mongoose-schema-formatdate');
var autoinc = require('mongoose-id-autoinc');

var Schema = mongoose.Schema;
ObjectId = Schema.ObjectId;

var newsSchema = Schema({
	postingNum : Number,
  _creator : { type: Schema.Types.ObjectId, ref: 'Member' },
  hit : { type:Number, default:0 },
  level : { type:Number, default:0 },
  uTitle   : String,
  uContent : String,
  regdate : { type:Formatdate, format:'YYYY-MM-DD HH:mm:ss', default: Date.now },
  nTitle : String,
  nUrl : String,
  nImgurl : { type:String, default:'0'},
  nCategory : { type:String, default:'N' },
  nComment : [{ type: Schema.Types.ObjectId, ref: 'NewsComment' }],
  like     : [{ type: Schema.Types.ObjectId, ref: 'Member' }],
  rePublish : [{ type: Schema.Types.ObjectId, ref: 'Member' }],
  memo : {
    content:String,
    regdate: { type:Formatdate, format:'YYYY-MM-DD HH:mm:ss' }
  }
});

newsSchema.plugin(autoinc.plugin, {
  model: 'NewsCard',
  field: 'postingNum',
  start:37,
  step:1
});

module.exports = mongoose.model('NewsCard', newsSchema);