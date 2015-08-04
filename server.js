'use strict';
var http = require('http');
var dispatcher = require('httpdispatcher');
var url = require('url');
var Firebase = require('firebase');
var changeCase = require('change-case')
var fs = require("fs")
var sendgrid = require("sendgrid")("Jakobhartman","Dangers1177"); 


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
  urlText = urlText.split("&")
  var str = {token:"",team_id:"",team_domain:"",channel_id:"",channel_name:"",user_id:"",user_name:"",command:"",text:""}
  for(var i = 0;i < urlText.length;i++){
    var index = urlText[i].indexOf("=");
    urlText[i] = urlText[i].substring(index + 1,urlText[i].length);
  }
  str.token = urlText[0];
  str.team_id = urlText[1];
  str.team_domain = urlText[2];
  str.channel_id = urlText[3];
  str.channel_name = urlText[4];
  str.user_id = urlText[5];
  str.user_name = urlText[6];
  str.command = urlText[7];
  str.text = urlText[8];

  return str
}

//A sample POST request
dispatcher.onPost('/card', function(req, res) {
	var params = getParams(req.body);
  console.log("response body:" + req.body)
  res.end()
	var card = params.text;
	var channel = params.channel_name;
	var team = params.team_id;
	var client = '';
  var slackURL = new Firebase("https://slackintergrationmtg.firebaseio.com/slacks/" + team);
  slackURL.once("value",function(child){
    client = child.val()
    if(card === 'random') {
      getRandomCard(channel, client);
      
    }else if(card === 'random10'){
      for(var i = 0;i < 10;i++){
        getRandomCard(channel, client)
      }
    } else{
      getCard(card,channel,client,res);

    }
  })
 })

function postToSlack(channel, client, cardURI) {
	var slack = require('slack-notify')('https://hooks.slack.com/services/' + client);
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
  var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/MultiverseTable/');
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
  var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/MultiverseTable/' + card + "/ids");
    ref.once('value',function(child){
        if(child.val() !== null){
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
