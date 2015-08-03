'use strict';
var http = require('http');
var dispatcher = require('httpdispatcher');
var url = require('url');
var Firebase = require('firebase');
var changeCase = require('change-case')
var fs = require("fs")
var sendgrid = require("sendgrid")("Jakobhartman","Dangers1177"); 

var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/MultiverseTable/');
var cardCount = 15418;
var PORT = process.env.PORT || 5000;

String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}

function handleRequest(request, response){
	try {
		//Disptach
		dispatcher.dispatch(request, response);
	} catch(err) {
		console.log(err);
	}
}

var server = http.createServer(handleRequest);

server.listen(PORT, function() {
	//Callback triggered when server is successfully listening. Hurray!
	console.log('Listening on port ' + PORT);
});


//For all your static (js/css/images/etc.) set the directory name (relative path).
dispatcher.setStatic('/');

dispatcher.onPost("/register",function(req,res){
  console.log("Sending Mail")
    var payload   = {
      to      : 'Jakobhartman@hotmail.com',
      from    : 'Jakobhartman@hotmail.com',
      subject : 'Saying Hi',
      text    : 'This is my first email through SendGrid'
    }
    
    sendgrid.send(payload, function(err, json) {
        if (err) { console.error(err); }
        console.log(json);
    });
    res.end()
});

dispatcher.onPost("/validateEmail",function(req,res){
  
})

//A sample GET request
dispatcher.onGet('/', function(req, res) {
  fs.readFile('assets/css/index.css',function(er,html){
    if(er){
      console.log(er)
    }
    res.writeHeader(200, {"Content-Type": "text/css"});
  })
	fs.readFile('assets/views/index.html',function(er,html){
    if(er){
      console.log(er)
    }
    res.writeHeader(200, {"Content-Type": "text/html"});
    res.write(html);
    res.end();
  })
})

dispatcher.onGet('/register', function(req, res) {
	fs.readFile('assets/views/register.html',function(er,html){
    if(er){
      console.log(er)
    }
    res.writeHeader(200, {"Content-Type": "text/html"});
    res.write(html);
    res.end();
  })
})


function getParams(urlText){
	var urlParts = url.parse(urlText, true);
	return urlParts.query;
}

//A sample POST request
dispatcher.onGet('/card', function(req, res) {
	var params = getParams(req.url);
  if(isEmpty(params)){
    res.end("Invalid string")
  }
  console.log(params)
	var card = JSON.parse(params.text);
  console.log(card)
	var channel = JSON.parse(params.channel_name);
  console.log(channel)
	var team = JSON.parse(params.team_id);
  console.log(team)
	var client = '';

  var slackURL = new Firebase("https://slackintergrationmtg.firebaseio.com/slacks/");
  slackURL.once("value",function(child){
    client = child.child(team).val()
    if(card === 'random') {
      getRandomCard(channel, client);
      res.end()
    }else if(card === 'random10'){
      for(var i = 0;i < 10;i++){
        getRandomCard(channel, client)
      }
      res.end()
    } else{
      getCard(card,channel,client,res);
    }
  })
 })

function postToSlack(channel, client, cardURI) {
	console.log('Client: ' + client);
	var slack = require('slack-notify')('https://hooks.slack.com/services/' + client);

	console.log('Channel: ' + channel);
	slack.send({
		channel: '#' + channel,
		text: cardURI,
		username: 'GathererBot'
	});

	slack.onError = function(err) {
		console.log(err.toString());
	};
}

function getRandomCard(channel, client) {
	ref.once('value', function(child) {
		var rNum = Math.floor((Math.random() * cardCount) + 0);
		var cards = child.val();
		var cName = Object.keys(cards)[rNum];
    var length = child.child(cName).child("ids").numChildren();
		var rnNum = Math.floor((Math.random() * (length - 1)));
		var mId = cards[cName].ids[Object.keys(cards[cName].ids)[rnNum]];
    console.log("Length: " + length + " Index: " + rnNum + " MID: " + mId + " Card: " + cName)
		var uri = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + mId + '&type=card';
		if(mId == undefined){

    }else{
      postToSlack(channel, client, uri);
    }
	})
}

function getCard(card,channel,client,res){
  
  card = sanitizeName(card)
  console.log(card)
    ref.once('value',function(child){
        var ids = child.child(card).child("ids");
        if(ids.val() !== null){
          var length = ids.numChildren();
          var rnNum = Math.floor((Math.random() * (length - 1)));
          var getIds = ids.val()
          console.log(getIds)
          var key = Object.keys(getIds)[rnNum]
          console.log(key)
          var mId = getIds[key]
          console.log("Length: " + length + " Index: " + rnNum + " MID: " + mId + " Card: " + card)
          var uri = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + mId + '&type=card';
          res.end();
          if(mId == undefined){
            res.end("Could not find Multiverse ID\n")
          }else{
            postToSlack(channel, client, uri);
          }
      }else{
        res.end("Bad Card Name\n")
      }
    })

}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return true;
}

function sanitizeName(card){
  var hiphen = card.indexOf("-");
  if(hiphen != -1){
    card = card.replaceAt(hiphen," ");
  }
  card = changeCase.titleCase(card)
  if(hiphen != -1){
    card = card.replaceAt(hiphen,"-")
  }
  card = card.replace("Of","of");
  card = card.replace("The","the");
  return card
}
