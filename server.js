var http = require('http');
var dispatcher = require('httpdispatcher');
var url = require('url')
var Firebase = require('firebase')
var querystring = require('querystring');
var Curl = require('node-curl');
var Slack = require('node-slack');


var ref = new Firebase("https://magictgdeckpricer.firebaseio.com/MultiverseTable/")
var cardCount = 15418;
const PORT=8080; 

function handleRequest(request, response){
    try {
        //Disptach
        dispatcher.dispatch(request, response);
    } catch(err) {
        console.log(err);
    }
}

var server = http.createServer(handleRequest);

server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
    
});


//For all your static (js/css/images/etc.) set the directory name (relative path).
dispatcher.setStatic('/');

//A sample GET request    
dispatcher.onGet("/page1", function(req, res) {
    
});

function getParams(urlText){
  var url_parts = url.parse(urlText,true)
  return url_parts.query
}

//A sample POST request
dispatcher.onPost("/card", function(req, res) {
  var params = getParams(req.url);
  var card = JSON.parse(params.text);
  var channel = JSON.parse(params.channel_name)
  var team = JSON.parse(params.team_id)
  var client = "";
  
  
  
  console.log(team)
  
  switch(team){
    case "T07AGCZNZ": 
                client = "T07AGCZNZ/B07HDETK9/cWvG3OEEYv2SXLNepiZUEcTZ"
    break;
    case "T02FJ886H":
                client = "T02FJ886H/B07FUFG9J/SdAyVpMjNGUn1XGX7ooPrdeI"
    break;
    default:
      res.end("Couldn't find team. Check team id input")
    break;
  }
  
  if(card == "random"){
    getRandomCard(channel,client)
  }
  
  
  res.end("Card: " +  card + " Channel: " + channel + " Team: " + team  + "\n")
});

function getRandomCard(channel,client){

    
    ref.once("value",function(child){
        var rNum  = Math.floor((Math.random() * cardCount) + 0);
        var cards = child.val();
        var cName = Object.keys(cards)[rNum]
        console.log("Card Name: " + cName)
        var rnNum =  Math.floor((Math.random() * Object.keys(cards[cName]).length) - 1);
        var mId = cards[cName]["ids"][Object.keys(cards[cName]["ids"])[rnNum]]
        console.log(mId)
        uri = "http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=" + mId + "&type=card"
        postToSlack(channel,client,uri)
    })
        
}

function postToSlack(channel,client,cardURI){

  slack = require('slack-notify')("https://hooks.slack.com/services/" + client);
    slack.send({
        channel: '#' + channel,
        text: cardURI,
        username: 'GathererBot'
    })
  slack.onError = function (err) {
    console.log('API error:', err);
  };
}