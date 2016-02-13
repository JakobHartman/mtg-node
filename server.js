'use strict';
var Firebase = require('firebase');
var fs = require("fs")

var express = require("express")
var app = express()
var users;
var cardCount = 15418;
var PORT = process.env.PORT || 8080;
var Slack = require('node-slack');
var slack;

var searchCards = new Array();

var server = app.listen(PORT, function() {
	console.log('Listening on port ' + PORT);
  var slackURL = new Firebase("https://slackintergrationmtg.firebaseio.com/slacks/")
  slackURL.on("value",function(child){
    users = child.val();
  })
  new Firebase("https://magictgdeckpricer.firebaseio.com/MultiverseTable/").on('value',function(data){
      data.forEach(function(keys){
          searchCards .push(keys.key());
      })
      console.log(searchCards.length + " cards found")
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
  var options = "";
  var hook_url = 'https://hooks.slack.com/services/' + users[params.team_id];
  slack = new Slack(hook_url,options);

  slack.onError = function(err) {
    console.log(err.toString());
  };
  
    var length = params.text.split("\:");
    console.log("Length: " + length.length)
    console.log("Card: " + params.text)
    console.log("Channel: " + params.channel_name)
    if(length.length == 1){
      if(params.text == 'random') {
        getRandomCard(params.channel_name);
        res.end();
      }else if(params.text == 'sets'){
        console.log("Showing sets");
        var string = showSets(res)
      } else{
        getCard(params.text,params.channel_name,res);
      }
    } else if(length.length == 2){
      if(length[0].length == 3 || length[0] == 'cquery'){
        var code = length[0].toUpperCase();
        var cardName = sanitizeName(length[1])
        console.log(code)
        console.log(cardName)
        if(cardName.toLowerCase() == "random"){
          getRandSpecCard(params.channel_name,code,res)
        }else if(code.toLowerCase() == "cquery"){ 
          if(cardName.length < 3){
            res.end("Invalid search: Not long enough")
          }
          searchCard(cardName,res)
        }else{
          getSpecCard(params.channel_name,code,cardName,res)
        }
        
      } else{
        res.end("Invalid Set Code")
      }
    }
 })

function searchCard(search,res){
  var resCards = "Suggestions: \n"
  for (var i = 0; i < searchCards.length;i++){
    if(searchCards[i].length >= search.length){
      if(searchCards [i].indexOf(search) != -1){
        resCards += searchCards [i] + "\n"
      }
    }
  }
  res.end(resCards)
}

function getRandSpecCard(channel,code,res){
  var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/multiverseSet/' + code)
      ref.once("value",function(child){
        var data = child.val();
        var num = Object.keys(data).length;
            num =  Math.floor((Math.random() * (num - 1)));
        var mId = data[Object.keys(data)[num]]["ids"]
        console.log(mId)
        var url = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + mId + '&type=card'
        postToSlack(channel,url)
      })
}

function postToSlack(channel, cardURI) {
	slack.send({
		channel: '#' + channel,
		text: cardURI,
		username: 'GathererBot'
	});
}

function getSpecCard(channel,code,card,res){
      
      code = code.toUpperCase();
      console.log(code + " - " + card)
      var ref = new Firebase('https://magictgdeckpricer.firebaseio.com/multiverseSet/' + code).orderByChild("name").startAt(card).endAt(card).limitToFirst(1);
        ref.once("value",function(child){
            var data = child.val();
            if(data == null){
              res.end("Invaild card/set");
            }else{ 
              var mId = data[Object.keys(data)[0]]["ids"]
              var url = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + mId + '&type=card'
              postToSlack(channel,url)
            }
        })
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
        postToSlack(channel, uri);
      })
    })
		
}

function showSets(res){
  var text = "";
  var ref = new Firebase("https://magictgdeckpricer.firebaseio.com/setInfoX");
  ref.once('value',function(data){
      data.forEach(function(set){
        var theSet = set.val();
        text += theSet.code + " - " + theSet.name + "\n"
      })
      res.end(text);
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
          var rnNum = Math.floor(Math.random() * length);
          var key = cd["set"+rnNum]
          var uri = 'http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=' + key + '&type=card';
          if(key == undefined){
            res.end("Could not find Multiverse ID\n")
          }else{
            postToSlack(channel, uri);
          }
        }else{ 
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
