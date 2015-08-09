'use strict';
var Firebase = require('firebase');
var changeCase = require('change-case')
var fs = require("fs")
var sendgrid = require("sendgrid")("Jakobhartman","Dangers1177"); 
var express = require("express")
var app = express()
var users;
var cardCount = 15418;
var PORT = process.env.PORT || 8080;
var slack;

var server = app.listen(PORT, function() {
	console.log('Listening on port ' + PORT);
  var slackURL = new Firebase("https://slackintergrationmtg.firebaseio.com/slacks/")
  slackURL.on("value",function(child){
    users = child.val();
  })
});


//For all your static (js/css/images/etc.) set the directory name (relative path).
app.use(express.static(__dirname + '/assets'));

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
  slack = require('slack-notify')('https://hooks.slack.com/services/' + users[params.team_id]);
  slack.onError = function(err) {
    console.log(err.toString());
  };
  res.end()
    if(params.text === 'random') {
      getRandomCard(params.channel_name );
      
    }else if(params.text === 'random10'){
      for(var i = 0;i < 10;i++){
        getRandomCard(params.channel_name)
      }
    } else{
      getCard(params.text,params.channel_name,res);

    }
 })

function postToSlack(channel, cardURI) {
	slack.send({
		channel: '#' + channel,
		text: cardURI,
		username: 'TestGathererBot'
	});
}

function getRandomCard(channel) {
  var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/MultiverseTable/');
		var rNum = Math.floor((Math.random() * cardCount) + 0);
    ref.once("value",function(child){
      var cards = child.val();
      var cName = Object.keys(cards)[rNum];
      var length = Object.keys(cards[cName].ids).length
      var rnNum = Math.floor((Math.random() * (length - 1)));
      ref = ref.child(cName).child("ids").child("set" + rnNum);
      ref.once("value",function(ch){
        var mId = ch.val()
        var uri = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + mId + '&type=card';
        postToSlack(channel, client, uri);
      })
    })
		
}

function getCard(card,channel,res){  
  card = sanitizeName(card)
  console.log(card)
    var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/MultiverseTable/').orderByChild("name").startAt(card).endAt(card).limitToFirst(1);
    ref.once('value',function(child){
        if(child.val() !== null){
          var data = child.val()
          var cd = data[Object.keys(data)[0]]["ids"]
          var length = Object.keys(cd).length
          console.log("Number of Sets: " + length)
          var rnNum = Math.floor(Math.random() * length);
          console.log("Set Selected: " + rnNum)
          var key = cd["set"+rnNum]
          console.log(key)
          var uri = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + key + '&type=card';
          if(key == undefined){
            res.end("Could not find Multiverse ID\n")
          }else{
            postToSlack(channel, client, uri);
          }
        }else{ 
        console.log("Bad Card Name\n")
        res.end("Bad Card Name\n")
      }
    })
}

function sanitizeName(card){
  var hiphen = card.indexOf("-");
  var period = card.indexOf(".");
  var amper = card.indexOf("&");
  var indices;
  if(period != -1){
    indices = getIndexes(card,".");
    for (var i = 0; i < indices.length;i++) {
      card = card.replaceAt(indices[i]," ")
    };
  }
  if(amper != -1){
    card = card.replaceAt(amper," ");
  }
  if(hiphen != -1){
    card = card.replaceAt(hiphen," ");
  }
  card = toTitleCase(card)
  if(amper != -1){
    card = card.replaceAt(amper,"&");
  }
  if(period != -1){
    for (var i = 0; i < indices.length;i++) {
      card = card.replaceAt(indices[i],".")
    };
  }
  if(hiphen != -1){
    card = card.replaceAt(hiphen,"-")
  }
  var s = card.split(" ")
  if(s[0] != "To"){
    card = card.replace("To","to");
  }
  if(s[0] != "This"){
    card = card.replace("This","this");
  }
  
  card = card.replace("Of","of");
  card = card.replace("The","the");
  return card
}

String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function getIndexes(str,char){
  var indices = [];
  for(var i=0; i<str.length;i++) {
    if (str[i] === char) indices.push(i);
  }
  return indices;
}
