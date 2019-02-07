const _ = require('underscore');
const log = require('../log');
const handler = require('./handlerController');
const dialogflow = require('dialogflow');
const asdfjkl =require('asdfjkl/lib/asdfjkl') ;
const uuidv4 = require('uuid/v4');

module.exports = {
  checkRequest,
  detectIntent
};

function checkRequest(req, res, next){
  log.info('in checkRequest')
  log.info(req.body);

  if (!(req.body.hasOwnProperty('userUtterance'))){
    var errCode = 400;
    var errMsg = 'The request does not have userUtterance key';
    log.info(errMsg);
    res.status(errCode).json(errMsg);
  } else if (req.body.userUtterance === "") {
    var errCode = 400;
    var errMsg = 'The user did not say anything';
    log.info(errMsg);
    res.json({fulfillmentText:"Sorry you didn't say anything, try again?"})
  }
  //// can't figure out how to detect gibberish yet
  //else if(asdfjkl(req.body.userUtterance)){
  //   log.info('user said gibberish')
  //   console.log(asdfjkl(req.body.userUtterance));
  //   res.json({fulfillmentText:"Sorry I think you entered some gibberish can you say again?"})
  // }
  else {
    if (!(req.body.hasOwnProperty('sessionID')) || req.body.sessionID === ""){
      var id = uuidv4();
      req.body.sessionID = id;
    }
    next();
  }
};

async function detectIntent(req, res, next){
  var projectId = 'smogshopagent-7dde1'

  const sessionClient = new dialogflow.SessionsClient();
  const sessionPath = sessionClient.sessionPath(projectId, req.body.sessionID);

  const request = {
    session: sessionPath,
    queryInput:{
      text: {
        text: req.body.userUtterance,
        languageCode: 'en-US',
      },
    },
  };

  const responses = await sessionClient.detectIntent(request);
  console.log('Detected Intent');
  const result = responses[0].queryResult;
  console.log(`Query: ${result.queryText}`);
  console.log(`Response: ${result.fulfillmentText}`);
  if(result.intent){
    console.log(` Intent: ${result.intent.displayName}`);
  } else {
    console.log('No intent matched');
  }

  res.json(result);
}
