const _ = require('underscore');
const log = require('../log');
const handler = require('./handlerController');
const dialogflow = require('dialogflow');
const asdfjkl =require('asdfjkl/lib/asdfjkl') ;
const uuidv4 = require('uuid/v4');
var pg = require('pg');
const env = require('../env');
const path = require('path');

pg.defaults.ssl = true;

const databaseURL = env.databaseURI;
const appRoot = path.join(__dirname,'../../../')

module.exports = {
  checkRequest,
  findResponse,
  getAgent,
  getAgentCredentials
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

function getAgent(req, rex, next){
  log.info('getAgent in Chatbot api is called')

  var client = new pg.Client({
    connectionString: databaseURL
  });
  client.connect();

  client.query('SELECT business_agent FROM business_info WHERE business_id = $1', [req.body.userID])
  .then(result=>{
    const businessAgent = result.rows[0].business_agent;
    req.body.businessAgent=businessAgent;
    log.info('agent successfully queried with ' + req.body.businessAgent + ' selected')
    next();
  })
  .catch(err=>{
    log.info(err);
    if (err.statusCode>=100 && err.statusCode<600) {
      res.status(err.statusCode).json(err);
    } else {
      res.status(500).json(err);
    }
  })
  .then(() => client.end());
}

function getAgentCredentials(req, res, next){
  log.info('getAgentCredentials in Chatbot api is called')

  var client = new pg.Client({
    connectionString: databaseURL
  });
  client.connect();

  client.query('SELECT * FROM dialogflow_agent WHERE agent = $1', [req.body.businessAgent])
  .then(result=>{
    log.info(result.rows[0].project_id + ' is selected');
    const dialogflowProjectId=result.rows[0].project_id;
    const dialogflowCredentialPath = path.join(appRoot,result.rows[0].credential_path);
    req.body.dialogflowProjectId=dialogflowProjectId;
    req.body.dialogflowCredentialPath=dialogflowCredentialPath;
    log.info('agent credentials successfully queried with ' + req.body.dialogflowProjectId + ' selected')
    next();
  })
  .catch(err=>{
    log.info(err);
    if (err.statusCode>=100 && err.statusCode<600) {
      res.status(err.statusCode).json(err);
    } else {
      res.status(500).json(err);
    }
  })
  .then(() => client.end());
}

async function findResponse(req, res, next){
  const detectedResult = await detectIntent(req.body.dialogflowProjectId, req.body.dialogflowCredentialPath, req.body.sessionID, req.body.userUtterance)

  if(detectedResult.intent.displayName == 'hours-regular'){
    const response = handleRegularHour(req, detectedResult)
    console.log(response)
    res.json({fulfillmentText:"returned texts"})
  }else if(detectedResult.intent.displayName=='hours-holiday'){
    const response = handleHolidayHour(req, detectedResult)
    res.json(response)
  }else{
    res.json(detectedResult)
  }
}

async function detectIntent(projectId, filePath, userId, question){
  console.log(filePath + ' in detectIntent')
  const sessionClient = new dialogflow.SessionsClient({
    projectId: projectId,
    keyFilename: filePath
  });
  const sessionPath = sessionClient.sessionPath(projectId, userId);

  console.log(sessionPath)

  const request = {
    session: sessionPath,
    queryInput:{
      text: {
        text: question,
        languageCode: 'en-US',
      },
    },
  };

  const responses = await sessionClient.detectIntent(request);
  console.log('Detected Intent');
  const result = responses[0].queryResult;
  if(result.intent){
    console.log(` Intent: ${result.intent.displayName}`)
    console.log('result: %j', result)
  } else {
    console.log('No intent matched');
  }
  return(result);
}

//a function to handle the cases for regular-hour intents
async function handleRegularHour(req, queryResult){
  console.log('In handle regular hour')
  log.info('In handle regular hour')
  var response1

  var client = new pg.Client({
    connectionString: databaseURL
  });
  client.connect();

  client.query('SELECT * FROM business_hours WHERE business_id = $1',[req.body.userID])
  .then(result=>{
    const hours=result.rows;
    const hoursJson = toJsonHours(result).hoursJson;
    const hoursText = toJsonHours(result).hoursText;

    //first case is both day and time are obtained from the userUtterance
    if(queryResult.parameters.fields.date.stringValue!=="" &&queryResult.parameters.fields.time.stringValue!==""){
      log.info('in first case')
      const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
      const requestDay=requestDate.getDay();
      const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
      const requestHour = requestTime.getHours();
      const requestMinute = requestTime.getMinutes()
      const requestDayHours = getRegularHoursOneDay(requestDay,hoursJson);
      if(requestDayHours.closed){
        response1 = {fulfillmentText:'Sorry we are closed on ' + requestDay}
      }else if ((requestHour+requestMinute/60)<requestDayHours.closes[0] && (requestHour+requestMinute/60)>requestDayHours.opens[0]){
        response1 = {fulfillmentText:'Yes we are open at '+ requestHour + ":" + requestMinute + ' on ' + requestDay}
      } else {
        response1 = {fulfillmentText: 'Sorry we are closed at ' + requestHour + ":" + requestMinute + ' on ' + requestDay}
      }
    } else if(queryResult.parameters.fields.date.stringValue!=="" && queryResult.parameters.fields.time.stringValue === ""){ // second case is if only day is obtained
      log.info('in second case')
      const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
      const requestDay=requestDate.getDay();
      const requestDayHours = getRegularHoursOneDay(requestDay,hoursJson);
      if (!requestDayHours.closed){
        response1 = {fulfillmentText:'Yes we are open on ' + requestDay + '. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0] + ' on ' + requestDay}
      } else {
        response1 = {fulfillmentText: 'Sorry we are closed on ' + requestDay}
      }
    } else if(queryResult.parameters.fields.date.stringValue==="" && queryResult.parameters.fields.time.stringValue !== ""){ //third case is if only time is obtained
      log.info('in third case')
      const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
      const requestDay = requestTime.getDay()
      const requestHour = requestTime.getHours();
      const requestMinute = requestTime.getMinutes()
      const requestDayHours = getRegularHoursOneDay(requestDay,hoursJson);
      if ((requestHour+requestMinute/60)<requestDayHours.closes[0] && (requestHour+requestMinute/60)>requestDayHours.opens[0]){
        response1 = {fulfillmentText:'Yes we are open at '+ requestHour + ":" + requestMinute + ' today. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0]}
      } else {
        response1 = {fulfillmentText: 'Sorry we are closed at ' + requestHour + ":" + requestMinute + ' today. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0]}
      }
    } else {
      response1 = {fulfillmentText: 'Our regular hours are: \n' + hoursText}
    }
    log.info(response1)
    client.end()
    return response1;
  })
  .catch(err=>{
    log.info(err);
    if (err.statusCode>=100 && err.statusCode<600) {
      res.status(err.statusCode).json(err);
    } else {
      res.status(500).json(err);
    }
  })
  // .then(() => {
  //   client.end()
  // });
}


//a function to handle the cases for holiday-hour intents

//function to get the open and close hours of a particular day in regular hour handling. The input is integer 0-6 per javascript Date().getDay() method
function getRegularHoursOneDay(day, hours){
  if(day==0){
    return(hours.Sunday)
  } else if (day==1) {
    return(hours.Monday)
  } else if (day==2) {
    return(hours.Tuesday)
  } else if (day==3) {
    return(hours.Wednesday)
  } else if (day==4) {
    return(hours.Thursday)
  } else if (day==5) {
    return(hours.Friday)
  } else if (day==6) {
    return(hours.Saturday)
  } else {
    return false
  }
}

//helper function to turn the queried rows from database to a json format and a text format
function toJsonHours(hours){
  var hoursJson={}
  var hoursText=''

  for(i=0;i<hours.rows.length;i++){
    if(hours.rows[i].day==0){
      hoursJson.Sunday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      //hoursText.concat(dayHoursToString('Sunday', hours.rows[i]));
    } else if (hours.rows[i].day==1) {
      hoursJson.Monday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      //hoursText.concat(dayHoursToString('Monday', hours.rows[i]));
    } else if (hours.rows[i].day==2) {
      hoursJson.Tuesday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      //hoursText.concat(dayHoursToString('Tuesday', hours.rows[i]));
    } else if (hours.rows[i].day==3) {
      hoursJson.Wednesday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      //hoursText.concat(dayHoursToString('Wednesday', hours.rows[i]));
    } else if (hours.rows[i].day==4) {
      hoursJson.Thursday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      //hoursText.concat(dayHoursToString('Thursday', hours.rows[i]));
    } else if (hours.rows[i].day==5) {
      hoursJson.Friday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      //hoursText.concat(dayHoursToString('Friday', hours.rows[i]));
    } else if (hours.rows[i].day==6) {
      hoursJson.Saturday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      //hoursText.concat(dayHoursToString('Saturday', hours.rows[i]));
    }
  }
  return {hoursJson:hoursJson, hoursText:hoursText}
}

//helper function to turn 1 day of open and close times to text. turns "closed" day to "[day]: closed"
function dayHoursToString(day, hours){
  var hoursText=''
  var openHours=''
  if(hours.closed){
    hoursText = day + ': closed \n'
  } else {
    for(i=0;i<hours.opens.length;i++){
      openHours = openHours + hours.opens[i] + ' - ' + hours.closes[i] + ', '
    }
    hoursText = day + openHours + ' \n'
  }
  return hoursText;
}
