//news.js
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var crypto = require('crypto');
var async =require('async');
//var mongoconn = require('../models/mongoconn');
var mongoconn = require('../models/mongonews');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

//뉴스 작성하기 -ok
router.post('/postNews', function (req, res){
	console.log('wht', req.body);
	var postnewsObj = {
		createrEmail: req.body.email, //작성자의 이메일
		createrTitle: req.body.title,
		createrContent: req.body.content,
		newsTitle: req.body.newstitle,
		newsUrl: req.body.url,
		newsCategory: req.body.category,
		newsRegdate: Date.now(),
		newsImageurl: req.body.imgurl
	}
	/*var datas = [createrEmail, createrTitle, createrContent, newsTitle, newsUrl, newsCategory, newsRegdate];*/

	mongoconn.postnews(postnewsObj, function(flag){
		console.log( 'users postnews test', flag);
		if(!flag){
			res.json({success:'fail'});
		}else if(flag){
			console.log('user true', flag);
			res.json({success:'ok'});
		}
	});
});

router.post('/shardCard', function (req, res){
	var params = {
		newsnum : req.body.newsnum,
		email : req.body.email
	};
	mongoconn.shardCard(params, function(card){
		if(typeof(card)=='err'){
			res.json({success:'fail', result:[], message:'fail'});
		}else if(card){
			//console.log('user true', card);
			res.json({success:'ok', result:card});
		}
	});
});

//뉴스 1개보기 -ok
router.post('/getNews', function (req, res){
	var postnum = req.body.newsnum;

	mongoconn.newscard(postnum, function(card){
		console.log( 'users newscard test', card);
		if(typeof(card)=='err'){
			res.json({success:'fail', result:[], message:'err'});
		}else if(card == false){
			console.log('user false', card);
			res.json({success:'fail', result:[], message:'fail'});
		}else if(card){
			//console.log('user true', card);
			res.json({success:'ok', result:card});
		}
	})
});

//뉴스피드 : 팔로우들의 뉴스 받아보기
router.post('/getNewsfeed', function (req, res){
	console.log('my mail', req.session.userSet);
	var params = {
		email : req.session.userSet.email,
		pagenum : req.body.num  //page번호
	};

	mongoconn.newsfeed(params, function(news){
		console.log('length', news.length);
		if(news.name){
			console.log('news getNewsfeed false', news);
			res.json({success:'fail', result:[], message:'fail'});
		}else if(news.length==0){
			console.log('news no newslist');
			res.json({success:'ok', result:[], message:'0'});
		}else if(news.length>0){
			//console.log('news getNewsfeed else', news);
			res.json({success:'ok', result:news, message:'ok'});
		}
	});

});

//뉴스피드 : 카테고리별 추천 카드 받아보기
router.post('/getCategoryNewsPage', function (req, res){
	var params = {
		category : req.body.category,
		page : req.body.page
	};

	mongoconn.categoryNews(params, function(news){
		if(typeof(news) == 'Error'){
			console.log('getCategoryNewsPage err');
			res.json({success:'fail', result:[], message:'err'});
		}else if(news == null){
			console.log('getCategoryNewsPage false', news);
			res.json({success:'fail', result:[], message:'fail'});
		}else if(news){
			//console.log('getCategoryNewsPage else', news);
			res.json({success:'ok', result:news, message:'ok'});
		}
	});
});


//뉴스카드 읽기 (조회수증가, 내 히스토리에 추가)
router.post('/readCard', function (req, res){
	var params = {
		email : req.body.email,
		newsnum : req.body.newsnum
	};

	mongoconn.readCard(params, function(news){
		if(typeof(news) == 'Error'){
			console.log('readCard err');
			res.json({success:'fail', result:[], message:'err'});
		}else if(news == null){
			console.log('readCard false', news);
			res.json({success:'fail', result:[], message:'fail'});
		}else if(news){
			console.log('readCard else', news);
			res.json({success:'ok', result:news, message:'ok'});
		}
	});
});

//뉴스카드 수정
router.post('/modNews', function (req, res){
	var postnewsObj = {
		postnum : req.body.newsnum,
		createrEmail: req.body.email, //작성자의 이메일
		createrTitle: req.body.title,
		createrContent: req.body.content,
		newsCategory: req.body.category,
	};

	mongoconn.modNews(postnewsObj, function(flag){
		if(typeof(flag)=='err'){
			res.json({success:'fail', result:[], message:'err'});
		}else if(flag){
			res.json({success:'ok', result:flag});
		}else if(flag==0){
			res.json({success:'fail', result:[], message:'null'});
		}
	});
});

//뉴스카드 삭제
router.post('/deleteNews', function (req, res){
	var params = {
		creatorMail : req.body.email,
		newsnum : req.body.newsnum
	};
	mongoconn.deleteNewscard(params, function(flag){
		console.log('news delete card', flag);
		console.log('news delete card', typeof(flag));
		if(flag.email == req.body.email){
			res.json({success:'ok', result:null});
		}else if(!flag){
			res.json({success:'fail', result:null});
		}
	});
});

//뉴스카드 공감 : 좋아요
router.post('/consensus', function (req, res){
	var params = {
		email : req.body.email, //공감하는 뉴스번호
		newsnum : req.body.newsnum  ////뉴스를 공감하는 사람 이메일
	};

	mongoconn.consensus(params, function(flag){
		console.log('news consensus', flag);
		if(flag._id){
			res.json({success:'ok', result:flag });
		}else if(flag == false){
			res.json({success:'fail', result:{} });
		}else{
			res.json({success:'fail', result:{} });
		}
	});
});

//뉴스카드 공감한사람 목록보기
router.post('/newscardLike', function (req, res){
	mongoconn.newsCardLike(req.body.newsnum, function(data){
		if(!data){
			res.json({success:'fail', result:[], message:'fail'});
		}else{
			res.json({success:'ok', result:data, message:'ok'});
		}
	});
});

//뉴스카드 공감 취소
router.post('/cancelConsensus', function (req, res){
	var params = {
		newsnum : req.body.newsnum,
		email : req.body.email
	};

	mongoconn.cancelConsensus(params, function(flag){
		console.log('news consensus cancel', flag);
		if(flag==false){
			res.json({success:'fail', result:[], message:'fail'});
		}else if(flag){
			res.json({success:'ok', result:flag, message:'ok'});
		}
	});

});

//뉴스카드 저장하기
router.post('/saveCards', function (req, res){
	var param = {
		newsnum : req.body.newsnum,
		email : req.session.userSet.email
	}
	mongoconn.saveCard(param, function(data){
		if(!data){
			res.json({success:'fail', result:'fail', message:'fail'});
		}else if(data){
			res.json({success:'ok', result:data, message:'ok'});
		}
	});
});
//뉴스카드 저장 취소
router.post('/cancelSavecard', function (req, res){
	var param = {
		newsnum : req.body.newsnum,
		email : req.session.userSet.email
	}
	mongoconn.cancelSavedcard(param, function(data){
		if(!data){
			res.json({success:'fail', result:'fail', message:'fail'});
		}else if(data){
			res.json({success:'ok', result:data, message:'ok'});
		}
	});
});

//뉴스에 댓글달기
router.post('/newsComment', function (req, res){
	var commentObj = {
		newsNum: req.body.newsnum,
		cUserEmail: req.body.email,
		cUsercontent: req.body.comment,
		cRegdate: Date.now()
	};

	//console.log('postnum', newsNum);
	mongoconn.pushComment(commentObj, function(flag){
		console.log('news consensus', flag);
		if(flag){
			res.json({success:'ok', result:null});
		}else if(flag==null){
			res.json({success:'fail', result:[], message:'wrong request'});
		}else if(flag==0){
			res.json({success:'fail', result:[], message:'fail'});
		}
	});

});

//뉴스의 댓글 가져오기 (최신순으로 20개)
router.post('/getNewsComment', function (req, res){
	var params = {
		newsnum : req.body.newsnum,
		page : req.body.page
	};

	mongoconn.newsComment(params, function(rows){
		if(typeof(rows) == 'Error'){
			res.json({success:"fail", result:[], message:"err" });
		}else if(rows.length == 0){
			res.json({success:"ok", result:[], message:"no list"});
		}else if(rows.length > 0){
			res.json({success:"ok", result:rows});
		}
	});
});

router.get('/getNewsComment/:newsnum/:page', function (req, res){
	var params = {
		newsnum : req.params.newsnum,
		page : req.params.page
	};
	console.log('params', params);
	mongoconn.newsComment(params, function(rows){
		if(typeof(rows) == 'Error'){
			res.json({success:"fail", result:[], message:"err" });
		}else if(rows.length == 0){
			res.json({success:"ok", result:[], message:"no list"});
		}else if(rows.length > 0){
			res.json({success:"ok", result:rows});
		}
	});
});

//댓글 공감하기
router.post('/commentlike', function (req, res){
	var params = {
		email:req.body.email,
		newsnum:req.body.newsnum,
		cid:req.body.cid
	};
	mongoconn.likeComment(params, function(flag){
		if(!flag){
			res.json({success:'fail', result:[], message:'fail'});
		}else if(flag){
			res.json({success:'ok', result:[], message:'ok'});
		}
	});
});
//댓글 공감 취소
router.post('/cancelCommentlike', function (req, res){
	var params = {
		email:req.body.email,
		newsnum:req.body.newsnum,
		cid:req.body.cid
	};
	mongoconn.cancelCommentlike(params, function(flag){
		if(!flag){
			res.json({success:'fail', result:[], message:'fail'});
		}else if(flag){
			res.json({success:'ok', result:[], message:'ok'});
		}
	});
});

//댓글 공감하는 사람 목록 가져오기
router.post('/getCommentLike', function (req, res){
	var commentId = req.body.cid;

	mongoconn.commentlike(commentId, function(rows){
		if(rows.name){
			res.json({success:'fail', result:[]});
		}else{
			res.json({success:'ok', result:rows});
		}
	});
});

router.get('/getCommentLike', function (req, res){
	//var commentId = req.param.cid;
	console.log('test', req.url);
	var commentId = req.getCommentLike.cid;
	console.log = commentId;
	mongoconn.commentlike(commentId, function(rows){
		if(rows.name){
			res.json({success:'fail', result:[]});
		}else{
			res.json({success:'ok', result:rows});
		}
	});
});

//댓글 수정하기
router.post('/modComment', function (req, res){
	var params = {
		cUserEmail : req.body.email,
		commentId : req.body.cid,
		mComment : req.body.comment
	}
	mongoconn.modComment(params, function(flag){
		if(flag == false){
			console.log('news modcomment false');
			res.json({success:'fail', result:[], message:'fail'});
		}else if(flag){
			console.log('news modcomment done');
			res.json({success:'ok', result:null});
		}
	});
});

//댓글 삭제하기
router.post('/deleteComment', function (req, res){
	var params = {
		email : req.body.email,
		newsnum : req.body.newsnum,
		cid : req.body.cid
	};

	mongoconn.deleteComment(params, function(flag){
		if(!flag){
			res.json({success:'fail', result:[], message:'fail'});
		}else if(flag){
			res.json({success:'ok', result:[], message:'fail'});
		}
	});
});

//뉴스카드 검색
router.post('/searchCard', function (req, res){
	var keyword = req.body.word;
	mongoconn.searchCard(keyword, function(datas){
		if(datas.name){
			console.log('user searchCard err', datas);
			res.json({success:'fail', result:[], message:'fail'});
		}else if(datas){
			res.json({success:'ok', result:datas, message:'ok'});
		}
	});
});

//뉴스 원본에 메모 작성
router.post('/newsMemo', function (req, res){
	if(req.session.userSet == undefined){
		res.json({success:'fail', result:{}, message:'login'});
	}
	console.log(req.session.userSet.email);
	var param = {
		newsnum : req.body.newsnum,
		memo : req.body.memo,
		userEmail : req.session.userSet.email
	};

	mongoconn.newsMemo(param, function(news){
		if(typeof(news) == 'err'){
			res.json({success:'fail', result:{}, message:'fail'});
		}else if(news.name){
			console.log('news what news', news);
			res.json({success:'fail', result:{}, message:'No Auth'});
		}else if(news){
			console.log('news what news', news);
			res.json({success:'ok', result:news, message:'ok'});
		}
	});
});

router.post('/test', function (req, res){
	var mail = req.body.email;
	mongoconn.test(mail, function(data){
		res.json({success:'ok', data:data});
	})
});

router.post('/test2', function (req, res){

	mongoconn.newsupdate(req.body.go, function(data){
		res.json({success:'ok', data:data});
	})
});

router.post('/newsupdate', function (req, res){

});

module.exports = router;
