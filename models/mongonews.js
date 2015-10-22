//mongoconn.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment');

var notipush = require('./notipush');
var db = require('./db');
require('./notischema');
require('./memberschema');
require('./newsschema');
require('./commentschema');
var notiModel = db.model('Notice');
var memberModel = db.model('Member');
var newsModel = db.model('NewsCard');
var commentModel = db.model('NewsComment');

//뉴스 작성자의 정보를 가져오기
var getCreaterInfo = function(datas, callback){
	console.log('mongo getinfo ', datas);
	memberModel.findOne({email:datas.createrEmail}).select('_id').select('email').select('name').select('profileImg').select('_follower').exec(function (err, info){
		console.log('getinfo ', info);
		if(err){
			console.log('mongo:get myinfo',err);
			callback(null, false);
		}else if(info == null){
			console.log('mongo:get myinfo null', info);
			callback("ERROR", false);
		}else if(info){
			console.log('mongo:get myinfo success');
			console.log('mongo:cingo', info);
			console.log('mongo:info_id: ', info._id);
			callback(null, info, datas);
		}
	});
};

//뉴스 객체 생성, 저장
//createObj : 뉴스작성자의 id, datas : client 파라미터
var newsPosting = function (createObj, datas, callback){
	console.log('newsposting creator obj', createObj);
	console.log('newsposting datas', datas);

	var createCard = new newsModel({
		  _creator : createObj._id,
		  uTitle   : datas.createrTitle,
		  uContent : datas.createrContent,
		  regdate : datas.newsRegdate,
		  nTitle : datas.newsTitle,
		  nUrl : datas.newsUrl,
		  nCategory : datas.newsCategory,
		  nImgurl : datas.newsImageurl
	});

	//var newsUpdate = function(cardObj, )
	//새로운 카드를 newscard컬렉션에 추가
	createCard.save(function (err, row){
		if(err){
			console.log('err', err);
			callback(null, false, row);
		}else{
			console.log('card create success', row);
		}
	});

	//member컬렉션의 작성자 레코드에 _makeCard 배열에 자신이 작성한 뉴스 이력을 저장
	memberModel.update({_id:createObj._id}, {$push:{_makeCards:createCard._id}}, function (err, flag){
		if(err){
			console.log('mongo newsupdate err', err);
			callback(null, false);
		}else{
			console.log('mongo newsupdate', flag);
			callback(null, createObj, createCard._id);
		}

	});
};

//팔로워들의 알림 콜렉션에 추가
//cUserObj : 작성자 정보 cCard : 작성한 뉴스카드 아이디
var notiNewCard = function(cUserObj, cCard, callback){
	console.log('notiNewCard cCard', cCard);

	var notiCard = {
		message : 1,
		destination : cCard,
		sender : cUserObj._id,
		regdate : moment('YYYY-MM-DD HH:mm:ss')
	};

	notipush.makeCardNoti(cUserObj, notiCard, function(flag){
		console.log('mongo notiNewCard', flag);
		if(flag){
			callback(cCard);
		}else if(!flag){
			callback(false);
		}
	});
};

//뉴스카드 작성하기
exports.postnews = function(datas, callback){
	console.log('start', datas);
	async.waterfall([
		function(callback){
			getCreaterInfo(datas, callback);
		},
		function( info, datas, callback){
			if(!info){
				callback(null, false);
			}else{
				newsPosting( info, datas, callback);
			}
		},
		function(createObj, createCard, callback){
			if(!createObj){
				rollback(createCard._id, callback);
			}
			notiNewCard(createObj, createCard, callback);
		}
	], function(flag){
		if(typeof(flag) == 'Error'){
			console.log('waterfall',flag);
			callback(false);
		}else if(!flag){
			console.log('waterfall',flag);
			callback(flag);
		}
			console.log('waterfall',flag);
			callback(flag);
	});
	var rollback = function(doc, callback){
		if(!doc){
			callback(false);
		}else{
			newsModel.findByIdAndRemove(doc.id, function (err, doc){
				console.log('mongo card rollback', doc);
				callback(false);
			});
		}
	};
};

//다른사람의 뉴스카드를 내 카드로 공유하기
exports.shardCard = function(datas, callback){
	memberModel.findOne({email:datas.email}, {_id:1, email:1, name:1, profileImg:1, likeCategory:1}).exec(function (err, myinfo){
		if(err){
			console.log('shardCard getmyinfo err', err);
			callback(false);
		}else{
			newsModel.findOneAndUpdate({postingNum:datas.newsnum}, {$addToSet:{rePublish:myinfo}, $inc:{level:3}}, {multi:true})
			.count('rePublish')
			.exec(function (err, news){
				if(err){
					console.log('shardCard news Republish err', err);
					callback(false);
				}else{
					memberModel.update({email:datas.email}, {$addToSet:{_makeCards:news._id}}).exec(function (err, info){
						if(err){
							console.log('shardCard getmyinfo err', err);
							callback(false);
						}else{
							if(Math.log(news.rePublish)%2 == 0 ){
								var newspubNoti = {
									message : 5,
									destination : news._id,
									sender : news._id
								};
								notipush.beyondShare(news._creator, newspubNoti, function(flag){
									if(flag){
										callback(news);
									}else if(!flag){
										callback(false);
									}
								});
							}else{
								callback(true);
							}
						}
					})
				}
			});
		}
	});
};

//뉴스카드 저장하기
exports.saveCard = function(params, callback){
	newsModel.findOne({postingNum:params.newsnum}, {_id:1})
	.exec(function (err, news){
		if(err){
			console.log('mongo:savedCard getnews err', err);
			callback(false);
		}else{
			memberModel.findOneAndUpdate({email:params.email}, {$addToSet:{_savedCards:news._id}})
			.select('-password')
			.exec(function (err, myinfo){
				if(err){
					console.log('mongo:savedCard pushnews err', err);
					callback(false);
				}else{
					console.log('mongo:savedCard pushnews', myinfo);
					console.log('mongo:savedCard pushnews', news._id);
					callback(news._id);
				}
			});
		}

	});
};

//뉴스카드 저장하기 취소
exports.cancelSavedcard = function(params, callback){
	newsModel.findOne({postingNum:params.newsnum}, {_id:1})
	.exec(function (err, news){
		if(err){
			console.log('mongo:cancel savedCard getnews err', err);
			callback(false);
		}else{
			memberModel.findOneAndUpdate({email:params.email}, {$pull:{'_savedCards':news._id}}).exec(function (err, myinfo){
				if(err){
					console.log('mongo:cancel savedCard pullnews err', err);
					callback(false);
				}else{
					console.log('mongo:cancel savedCard pullnews err', myinfo);
					console.log('mongo:cancel savedCard pullnews err', news._id);
					callback(news._id);
				}
			});
		}
	});
};


//뉴스카드 하나 보기
exports.newscard = function(data, callback){
	var postnum = data;
	newsModel.findOne({postingNum:postnum}).populate('_creator', {_id:1, email:1, name:1, belongto:1, profileImg:1, likeCategory:1}).populate('nComment', {}).exec(function (err, docs){
		if(err){
			console.error('err', err);
			callback(false);
		}
		else if(docs == null){
			console.log('mongo newscard null');
			callback(false);
		}

		var options = {
			path: 'nComment._creator',
			model: 'Member',
			select: {_id:1, email:1, name:1, profileImg:1, belongto:1, likeCategory:1}
		};

		if(err) return res.json({success:"fail"});
		newsModel.populate(docs, options, function (err, card){
			//res.json(infos);
			callback(card);
		});
	});
};

//뉴스 원문 읽기 (조회수 증가)
exports.readCard = function(datas, callback){
	newsModel.findOneAndUpdate({postingNum:datas.newsnum}, {$inc:{hit:1}})
	.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1})
	.exec(function (err, news){
		if(err){
			console.log('mongo readCard getmyinfo err', err);
			callback(false);
		}else{
			memberModel.findOneAndUpdate({email:datas.email}, {$addToSet:{_history:news._id}})
			.exec(function (err, myinfo){
				if(err){
					console.log('mongo readCard getmyinfo err', err);
					callback(myinfo);
				}else{
					console.log('mongo readCard getmyinfo err', err);
					callback(news);
				}
			});
		}
	});
};

//카테고리별 뉴스 가져오기
exports.categoryNews = function(datas, callback){
	var page = (datas.page - 1) * 20;
	newsModel.find({nCategory:datas.category})
	.sort({regdate:-1})
	.skip(page).limit(30)
	.sort({level:-1})
	.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1, belongto:1})
	.exec(function (err, news){
		if(err){
			console.log('mongo get category news err', err);
			callback(err);
		}else{
			//console.log('mongo get category news ', news);
			callback(news);
		}
	});
};

//인트로 후 진입하는 뉴스피드(내 팔로우의 카드 표시)
exports.newsfeed = function(datas, callback){
	var page = (datas.pagenum-1)*20;
	memberModel.findOne({email:datas.email})
	.select('_following').select('likeCategory')
	.exec(function (err, flist){
		if(err){
			console.log('mongo:following info err', err);
			callback(err);
		}else{
			//관심카테고리 문자열에서 정규식으로 특수문자 제거
			var userCategory = flist.likeCategory.replace(/\"/g,'');
			userCategory = userCategory.replace(/\[/g,'');
			userCategory = userCategory.replace(/\]/g,'');

			//문자열을 배열로 변환
			var categoryArray = new Array();
			categoryArray = userCategory.split(',');

			newsModel.find(
				{
					_creator:{$in:flist._following},
					nCategory:{$in:categoryArray}
				}
				,{__V:0}
				,{multi:true}
			).populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1, belongto:1})
			.sort({regdate:-1}).skip(page).limit(20)
			.exec(function (err, nlist){
				if(err){
					console.log('mongo:get newsfeed err', err);
					callback(err);
				}else{
					callback(nlist);
				}
			});
		}
	});
};

//뉴스 삭제하기
exports.deleteNewscard = function(datas, callback){
	newsModel.findOne({postingNum:datas.newsnum}, {_creator:1}).populate('_creator', {'email':1}).exec(function(err, card){
		console.log('mongo:deleteNewscard news creator', card._creator.email);
		if(err) console.log('mongo deletecard err', err);
		if(card._creator.email == datas.creatorMail){
			newsModel.findOneAndRemove({postingNum:datas.newsnum})
			.populate('_creator', {_id:1, email:1})
			.exec(function(err, flag){
				console.log('mongo:deleteNewscard remove news', flag);
				if(err){
					console.log('mongo: newsCard delete err', err);
					callback(false);
				}else if(flag._creator == null){
					console.log('mongo:deleteNewscard already delete');
					callback(false);
				}else{
					console.log('mongo deletecard', flag);
				memberModel.findOneAndUpdate({email:flag._creator.email},
				 {$pull:{_makeCards:flag._id, _savedCards:flag._id}}, {safe:true}).exec(function (err, myinfo){
				 	console.log('mongo:mycard delete pull multi', myinfo);
						if(err){
							console.log('mongo:mycard delete pull err', err);
							callback(false);
						}else{
							console.log('mongo:mycard delete pull else', myinfo);
							callback(myinfo);
						}
					});

				}
			});
		}else if(card._creator.email != datas.creatorMail){
			callback(false);
		}
	});
};

//뉴스카드의 공감버튼을 누른 사용자의 정보 가져오기
var getUserInfo = function(params, callback){
	console.log('getCreator', params.email);
	memberModel.findOne({email:params.email}, {_id:1, email:1, name:1, profileImg:1, likeCategory:1}).exec(function(err, info){
		if(err) console.log('mongo consensus err', err);
		if(info){
			console.log('mongo consensus info', info);
			callback(null, params, info);
		}else if(info==null){
			callback(null, params, info);
		}
	});
};

//뉴스카드에 공감하는 사용자정보 넣기
var pushConsensus = function(params, info, callback){
	if(info == null || info == undefined){
		callback(0);
	}
	console.log('push', info);
	console.log('newsNumber', params.newsnum);
	newsModel.findOneAndUpdate({postingNum:params.newsnum},
		 {$addToSet:{like:info._id}, $inc:{level:1}}, {multi:true})
	.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCatecory:1, belongto:1, pushKey:1})
	.exec(function (err, news){
		if(err) console.log('mongo likepush err', err);
		console.log('mongo flag', news);
		callback(null, params, news, info);
	});
};
//뉴스카드 작성자에게 공감 알림
var pushNewslikeToNoti = function(params, news, info, callback){
	if(news._creator == info._id){
		console.log('likepush do not my card');
		callback(true);
	}else{
		var newslikeNoti = {
			message : 2,
			destination : news._id,
			sender : info._id
		};
		notipush.likeCardNoti(news._creator, newslikeNoti, function(flag){
			if(flag){
				callback(news);
			}else if(!flag){
				callback(false);
			}

		});
	}
};

//뉴스에 좋아요 누르기
exports.consensus = function(datas, callback){
	console.log('mongo consensus', datas);
	var params = datas;
	/*var newsnum = datas[0];
	var creatorEmail = datas[1];*/

	async.waterfall([
		function(callback){
			getUserInfo(params, callback);
		},
		function( info, newsnum, callback){
			pushConsensus( info, newsnum, callback);
		},
		function(params, news, info, callback){
			pushNewslikeToNoti(params, news, info, callback);
		}
	], function(flag){
		if(flag==1){
			callback(flag);
		}else{
			console.log('waterfall',flag);
			callback(flag);
		}
	});
	//newsCard.update({postingNum:newsnum}, {})
};

//뉴스카드 공감 취소
exports.cancelConsensus = function(datas, callback){
	memberModel.findOne({email:datas.email},  {_id:1, email:1, name:1, profileImg:1, likeCategory:1}).exec(function (err, myinfo){
		console.log('mongo calcenLike getmyinfo',myinfo._id);
		if(err){
			console.log('mongo cancelConsensus err', err);
			callback(false);
		}else{
			newsModel.findOneAndUpdate({postingNum:datas.newsnum}, {$inc:{level:-1}, $pull:{'like':myinfo._id}})
			.select('_id').select('_creator').select('like')
			.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1, pushkey:1})
			.exec(function (err, news){
				if(err){
					console.log('mongo cancelConsensus err', err);
					callback(false);
				}else{
					console.log('mongo cancelConsensus ok', news);
					callback(news);
				}
			});
		}
	});
};

//뉴스카드 공감한 사람 목록보기
exports.newsCardLike = function(data, callback){
	newsModel.findOne({postingNum:data}, {like:1}).populate('like', {_id:1, email:1, name:1, profileImg:1, likeCategory:1}).exec(function (err, infos){
		if(err){
			console.log('mongo newsCardLike err', err);
			callback(false);
		}else{
			callback(infos);
		}
	});
}

//댓글 공감하기
exports.likeComment = function(datas, callback){
	memberModel.findOne({email:datas.email}, {_id:1, email:1, name:1, profileImg:1, likeCategory:1}).exec(function (err, myinfo){
		if(err){
			console.log('likeComment myinfo get err', err);
			callback(false);
		}else{
			newsModel.findOne({postingNum:datas.newsnum}, {_id:1, _creator:1, postingNum:1})
			.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1, pushKey:1})
			.exec(function (err, news){
				commentModel.findOneAndUpdate({_id:datas.cid}, {$addToSet:{like:myinfo}})
				.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCetegory:1, pushKey:1})
				.exec(function (err, data){
					if(err){
						console.log('likeComment news get err', err);
						callback(false);
					}else{
						if(myinfo.email == data._creator.email){
							console.log('my comment');
							callback(true);
						}else{
							console.log('likeComment news get',news);
							var commentlikeNoti = {
								message : 4,
								destination : news._id,
								sender : myinfo._id
							};
							notipush.commentLike(news._creator, commentlikeNoti, function(flag){
								callback(flag);
							});
						}
					}
				});
			});
		}
	});
};

//뉴스카드 댓글공감하기 취소
exports.cancelCommentlike = function(datas, callback){
	memberModel.findOne({email:datas.email}, {_id:1, email:1, name:1, profileImg:1, likeCetegory:1}).exec(function (err, myinfo){
		if(err){
			console.log('cancel comment get myinfo err', err);
			callback(false);
		}else{
			commentModel.findOneAndUpdate({_id:datas.cid}, {$pull:{'like':myinfo._id}})
			.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1, pushKey:1})
			.exec(function (err, data){
				if(err){
					console.log('cancel comment remove err', err);
					callback(false);
				}else{
					console.log('cancel comment remove', data);
					callback(true);
				}
			});
		}
	});
};

//뉴스에 댓글을 작성하려는 사람의 정보를 가져오기
var getCreatorInfo = function(datas, callback){
	console.log('mongo commenter getCreator', datas.cUserEmail);
	memberModel.findOne({email:datas.cUserEmail}, {_id:1, email:1, name:1, profileImg:1, likeCategory:1}).exec(function(err, info){
		if(err) console.log('mongo commenter err', err);
		if(info){
			console.log('mongo commenter info', info);
			callback(null, info, datas);
		}else if(info==null){
			callback(null, info, datas);
		}
	});
};
//info: 댓글작성자 정보, datas:댓글객체
var pushNewComment = function(info, datas, callback){
	console.log('mongo commenter info', info);
	var comment = new commentModel({
		newsnum : datas.newsNum,
		_creator : info._id,
		comment : datas.cUsercontent,
		cRegdate : datas.cRegdate
	});
	console.log('mongo comment push', comment);

	comment.save(function (err, flag){
		if(err) console.log('err', err);
		console.log('comment create success');
	});

	newsModel.findOneAndUpdate({postingNum:datas.newsNum}, {$push:{nComment:comment}, $inc:{level:2}}).populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1}).exec(function (err, news){
		if(err) console.log('mongo likepush err', err);
			console.log('mongo flag', news);
			callback(null, datas, news, info);
	});
};
//datas:댓글객체, news:뉴스작성자정보, info:댓글작성자정보
var pushNewsCommentNoti = function(params, news, info, callback){
	if(news._creator == info._id){
		console.log('likepush it is my card');
		callback(true);
	}else{
		var newsCommentNoti = {
			message : 3,
			destination : news._id,
			sender : info._id
		};
		notipush.commentCard(news._creator, newsCommentNoti, function(flag){
			callback(flag);
		});
	}
};

//뉴스에 댓글 달기
exports.pushComment = function(datas, callback){
	console.log('mongo pushcomment', datas);
	async.waterfall([
		function(callback){
			getCreatorInfo(datas, callback)
		},
		function(info, datas, callback){
			pushNewComment(info, datas, callback);
		},
		function(params, news, info, callback){
			if(!info) callback(false);
			pushNewsCommentNoti(params, news, info, callback);
		}
	], function(flag){
		callback(flag);
	});
};



//뉴스카드 수정하기
exports.modNews = function(datas, callback){
	newsModel.findOne({postingNum:datas.postnum}, {_creator:1}).populate('_creator', {'email':1}).exec(function(err, card){
		if(err) console.log('mongo deletecard err', err);
		if(card._creator.email == datas.createrEmail){
			newsModel.update(
				{postingNum:datas.postnum},
				{$set:{
					uTitle:datas.createrTitle,
					uContent:datas.createrContent,
					nCategory:datas.newsCategory
					}
				}
				).exec(function(err, flag){
				console.log('mongo deletecard', flag);
				callback(flag);
			});
		}else if(card._creator.email != datas.createrEmail){
			callback(false);
		}
	});
};

//뉴스카드의 댓글 가져오기
exports.newsComment = function(datas, callback){
	var skipnum = (datas.page-1) * 20;
	console.log('skipnum', skipnum);
	commentModel.find({newsnum:datas.newsnum}).populate('_creator', {_id:1,email:1,name:1,profileImg:1,likeCetegory:1})
	.sort('cRegdate').skip(skipnum).limit(20)
	.exec(function (err, docs){
		console.log('mongo comment', docs);
		if(err){
			console.log('mongo:newsComment',err);
			callback(err);
		}else{
			console.log('mongo:Commenter info success');
			//res.json({success:"ok", result:info});
			console.log('mongo commenter info: ', docs);
			callback(docs);
		}
	});
};

//뉴스카드의 댓글을 공감하는 사람의 목록
exports.commentlike = function(data, callback){
	console.log('mongo comment like', data);
	commentModel.findById(data).select('like').populate('like', {email:1, name:1, profileImg:1, likeCategory:1}).exec(function(err, rows){
		if(err){
			console.log('mongo commentlike err');
			callback(err);
		}
		if(rows){
			console.log('mongo commentlike ', rows);
			callback(rows);
		}
	});
};

//뉴스카드의 댓글 수정
exports.modComment = function(datas, callback){
	console.log('mongo modComment', datas);
	var update = {comment : datas.mComment};
	var options = {new : true};
	commentModel.findById(datas.commentId).select('_creator').select('comment').populate('_creator', {email:1, name:1}).exec(function(err, row){
		if(err) console.log('mongo modcomment find err', err);
		else if(row._creator.email == datas.cUserEmail){
			commentModel.update({_id:datas.commentId}, {$set:{comment:datas.mComment}}).exec(function(err, flag){
				if(err){
					console.log('mongo modcomment err', err);
					callback(false);
				}else if(flag == null){
					console.log('mongo modcomment not found', flag);
					callback(false);
				}else if(flag){
					console.log('mongo modcomment info', flag);
					callback(true);
				}
			});
		}
	});
};

//댓글 삭제하기
exports.deleteComment = function(data, callback){
	commentModel.findById(data.cid).populate('_creator', {_id:1, email:1, name:1, profileImg:1}).exec(function (err, comm){
		console.log('mongo deletecomm find', comm);
		if(err){
			console.log('mongo deletecomm find err', err);
			callback(false);
		}else if(data.email == comm._creator.email){
			console.log('mongo deletecomm find comm', comm);
			commentModel.findByIdAndRemove(data.cid).exec(function (err, dfinal){
				if(err){
					console.log('mongo delete comm err', err);
					callback(false);
				}else{
					callback(true);
				}
			});
		}
	});
};

//뉴스카드 검색하기
exports.searchCard = function(datas, callback){
	var re = new RegExp(datas, 'i');
	newsModel.find().or([{'uTitle':{$regex: re}}, {'uContent':{$regex: re}}]).sort('regdate')
	.populate('_creator', {_id:1, email:1, name:1, profileImg:1, likeCategory:1, belongto:1})
	.exec(function(err, docs){
		if(err){
			console.log('mongo searchCard err', err);
			callback(err);
		}else if(docs){
			callback(docs);
		}
	});
};

exports.newscardPage = function(params, callback){
	newsModel.find({postingNum:postnum}).populate('_creator', {_id:1, email:1, name:1, belongto:1, profileImg:1}).populate('nComment', {}).exec(function (err, docs){
		if(err){
			console.error('err', err);
			callback(false);
		}
		else if(docs == null){
			console.log('mongo newscard null');
			callback(false);
		}

		var options = {
			path: 'nComment._creator',
			model: 'Member',
			select: {_id:1, email:1, name:1, profileImg:1, likeCategory:1}
		};

		if(err) return res.json({success:"fail"});
		newsModel.populate(docs, options, function (err, card){
			//res.json(infos);
			callback(card);
		});
	});
};
/*
*/
//메모 작성하기
exports.newsMemo = function(param, callback){
	newsModel.findOne({postingNum:param.newsnum}, {_id:1, _creator:1})
	.populate('_creator', {email:1})
	.exec(function (err, news){
		console.log('news _creator mail', news._creator.email);
		if(err){
			console.log('mongo: newsmemo get newsinfo err', err);
			callback(err);
		}else if(news._creator.email == param.userEmail){
			var update = {
				content : param.memo,
				regdate : Date.now()
			};
			newsModel.findOneAndUpdate({postingNum:param.newsnum}, {$set:{memo:update}}, {multi:1}).exec(function (err, memoNews){
				if(err){
					console.log('mongo: newsmemo get newsinfo err', err);
					console.log('mongo err', typeof(err));
					callback(err);
				}else{
					callback(memoNews);
				}
			});
		}else if(news._creator.email != param.userEmail){
			console.log('mongo: newsmemo no matched mail', news._creator.email);
			callback(false);
		}
	});
};

exports.test = function(data, callback){
	var mail = data;
	notiModel.findOne({user_email:mail}).populate('_noti').exec(function (err, info){
		console.log('tset', info);
		//callback(info);
		var options1 = {
			path:'_noti.destination',
			//model:'Member'
			model:'NewsCard'
		};

		var options2 = {
			path:'_noti.sender',
			model:'Member',
			select:{profileImg:1, email:1, name:1, likeCategory:1}
		};
		notiModel.populate(info, options2, function(err, docs1){
			notiModel.populate(docs1, options1, function(err, docs){
				console.log('testest', docs);
				callback(docs);
			});
		});
	});
};

exports.who = function(data, callback){

/*	newsModel.update({}, {$set:{_creator:	}}).exec(function (err, news){
		console.log('updating',news);
		callback(news);
	});*/
/*	memberModel.findOne({email:'headline@headline.com'}, {})

	newsModel.find({_creator:})*/
};

exports.newsupdate = function(data, callback){
	var updates = {
		memo:"memo test",
		regdate:Date.now()
	};
	memberModel.findOne({}, updates).exec(function (err, info){
		console.log('get info', info);
		/*newsModel.update({}, {$set:{level:0}}, {multi:1}).exec(function (err, news){
			callback(news);
		});*/
		newsModel.update({}, updates, {multi:1}).exec(function (err, news){
				callback(news);
			});
	});
};





// function result(err,obj){
// 	if(err) console.err("ERR", err);
// 	var msg
// 	if(obj.length)
// 		msg = false;
// 	else
// 		msg = obj;
// 	return obj;
// }


