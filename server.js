'use strict';
var Firebase = require('firebase');
var changeCase = require('change-case')
var fs = require("fs")
var bodyParser = require('body-parser');
var sendgrid = require("sendgrid")("Jakobhartman","Dangers1177"); 
var express = require("express")
var app = express()
var users;
var clock;



var cardCount = 15418;
var PORT = process.env.PORT || 5000;
var server = app.listen(PORT, function() {
	console.log('Listening on port ' + PORT);
  var slackURL = new Firebase("https://slackintergrationmtg.firebaseio.com/slacks/")
  slackURL.on("value",function(child){
    users = child.val();
  })
});


//For all your static (js/css/images/etc.) set the directory name (relative path).
app.use(express.static(__dirname + '/assets'));
app.use(bodyParser.json()); 

app.post("/register",function(req,res){
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

app.post("/validateEmail",function(req,res){
  
})

//A sample GET request
app.get('/', function(req, res) {
	fs.readFile('assets/views/index.html',function(er,html){
    if(er){
      console.log(er)
    }
    res.writeHeader(200, {"Content-Type": "text/html"});
    res.write(html);
    res.end();
  })
})

app.get('/register', function(req, res) {
	fs.readFile('assets/views/register.html',function(er,html){
    if(er){
      console.log(er)
    }
    res.writeHeader(200, {"Content-Type": "text/html"});
    res.write(html);
    res.end();
  })
})

//A sample POST request
app.get('/card', function(req, res) {
	var params = req.query;
  clock = 0;
  setInterval(function(){
    clock++;
  },1000)
  res.end()
    if(params.text === 'random') {
      getRandomCard(params.channel_name, users[params.team_id]);
      
    }else if(params.text === 'random10'){
      for(var i = 0;i < 10;i++){
        getRandomCard(params.channel_name, users[params.team_id])
      }
    } else{
      getCard(params.text,params.channel_name,users[params.team_id]);

    }
 })

function postToSlack(channel, client, cardURI) {
	var slack = require('slack-notify')('https://hooks.slack.com/services/' + client);
	slack.send({
		channel: '#' + channel,
		text: cardURI + "\n" + clock + " seconds to complete",
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
    ref = ref.child(cName + "/ids")
    ref.once("value",function(child){
      var length = Object.keys(child.val()).length;
      var rnNum = Math.floor((Math.random() * (1 - 1)));
      ref = ref.child(Object.keys(child.val())[rnNum])
      ref.once("value",function(child){
        var mId = child.val()
        var uri = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + mId + '&type=card';
        postToSlack(channel, client, uri);
      })
      
    })
    
	})
}

function getCard(card,channel,client){
  
  card = sanitizeName(card)
  var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/MultiverseTable/' + card + "/ids");
    ref.once('value',function(child){
        if(child.val() !== null){
          var length = child.numChildren();
          var rnNum = Math.floor((Math.random() * (length - 1)));
          var getIds = child.val()
          var key = Object.keys(getIds)[rnNum]
          var mId = getIds[key]
          var uri = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + mId + '&type=card';
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

String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}
