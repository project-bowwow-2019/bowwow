const _ = require('underscore');
const log = require('../log');
const handler = require('./handlerController');
const dialogflow = require('dialogflow');
const asdfjkl =require('asdfjkl/lib/asdfjkl') ;
const uuidv4 = require('uuid/v4');
var pg = require('pg');
const env = require('../env');
const path = require('path');
const businessHoursHelper = require('../helpers/businessHoursHelper')

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
  const contextToSend = resetContext(req.body.currentContext, req.body.handledContextNew);
  const detectedResult = await detectIntent(req.body.dialogflowProjectId, req.body.dialogflowCredentialPath, req.body.sessionID, req.body.userUtterance, contextToSend)
  const sessionContextPath ='projects/'+req.body.dialogflowProjectId+'/agent/sessions/'+req.body.sessionID+'/contexts/';
  const intentName = detectedResult.intent.displayName;

  if(intentName == 'hours-regular'){
    const trueRegHour = await checkRegularHour(req.body.userID, detectedResult)
    if(trueRegHour){
      const response = await handleRegularHour(req.body.userID, detectedResult)
      res.json(response)
    } else {
      const response = await handleHolidayHour(req.body.userID,detectedResult)
      res.json(response)
    }
  } else if (intentName == 'hours-holiday'){
    const response = await handleHolidayHour(req.body.userID, detectedResult)
    res.json(response)
  } else if (intentName == 'location'){
    const response1 = await handleLocation(req.body.userID, detectedResult,sessionContextPath)
    res.json(response1)
  } else if (intentName == 'star-status'){
    const response2 = await handleStarStatus(req.body.userID, detectedResult)
    res.json(response2)
  } else {
    res.json(detectedResult)
  }
}

async function detectIntent(projectId, filePath, userId, question, contexts, handledContexts){
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
    queryParameters:{
      contexts: contexts
    }
  };

  console.log('request: %j', request)

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

//a function that checks if the date the user asked is a holiday
async function checkRegularHour(userID,queryResult){
  console.log('In check regular hour')
  log.info('In check regular hour')
  var regularHour=true;

  if(queryResult.parameters.fields.date.stringValue!==""){
    log.info('in 1st case')
    const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
    const holiday = businessHoursHelper.checkHoliday(requestDate);

    if(!holiday){
      return true
    } else {
      return false
    }
  } else if(queryResult.parameters.fields.date.stringValue==="" && queryResult.parameters.fields.time.stringValue !== ""){ //third case is if only time is obtained
    log.info('in 2nd case')
    const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
    const holiday = businessHoursHelper.checkHoliday(requestTime);

    if(!holiday){
      return true
    } else {
      return false
    }

  } else {
    return true
  }
}

//a function to handle the cases for regular-hour intents
async function handleRegularHour(userID, queryResult){
  console.log('In handle regular hour')
  log.info('In handle regular hour')
  var response1='';
  const now = new Date();

  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();
  const result = await client.query('SELECT * FROM business_hours WHERE business_id = $1 ORDER BY day',[userID]);
  await client.end()
  const hoursJson = businessHoursHelper.toJsonHours(result).hoursJson;
  const hoursText = businessHoursHelper.toJsonHours(result).hoursText;

  //first case is both day and time are obtained from the userUtterance
  if(queryResult.parameters.fields.date.stringValue!=="" &&queryResult.parameters.fields.time.stringValue!==""){
    log.info('in first case')
    const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
    const requestDay=requestDate.getDay();
    const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
    const requestHour = requestTime.getHours();
    const requestMinute = requestTime.getMinutes()
    const requestDayHours =  businessHoursHelper.getRegularHoursOneDay(requestDay,hoursJson);
    const holiday = businessHoursHelper.checkHoliday(requestDate);

    if(requestDayHours.closed){
      response1 = {fulfillmentText:'Sorry we are closed on ' + businessHoursHelper.integerToDay(requestDay)};
    } else if ((requestHour+requestMinute/60)<requestDayHours.closes[0] && (requestHour+requestMinute/60)>requestDayHours.opens[0]){
      response1 = {fulfillmentText:'Yes we are open at '+ requestHour + ":" + requestMinute + ' on ' + businessHoursHelper.integerToDay(requestDay)}
    } else {
      response1 = {fulfillmentText: 'Sorry we are closed at ' + requestHour + ":" + requestMinute + ' on ' + businessHoursHelper.integerToDay(requestDay)}
    }

  } else if(queryResult.parameters.fields.date.stringValue!=="" && queryResult.parameters.fields.time.stringValue === ""){ // second case is if only day is obtained
    log.info('in second case')
    const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
    const requestDay=requestDate.getDay();
    const requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay,hoursJson);
    const holiday = businessHoursHelper.checkHoliday(requestDate);

    if (requestDayHours.closed){
      response1 = {fulfillmentText: 'Sorry we are closed on ' + businessHoursHelper.integerToDay(requestDay)};
    } else {
      response1 = {fulfillmentText:'Yes we are open on ' + businessHoursHelper.integerToDay(requestDay) + '. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0] + ' on ' + businessHoursHelper.integerToDay(requestDay)}
    }

  } else if(queryResult.parameters.fields.date.stringValue==="" && queryResult.parameters.fields.time.stringValue !== ""){ //third case is if only time is obtained
    log.info('in third case')
    const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
    const requestDay = requestTime.getDay()
    const requestHour = requestTime.getHours();
    const requestMinute = requestTime.getMinutes()
    const requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay,hoursJson);
    const holiday = businessHoursHelper.checkHoliday(requestDate);

    if (requestDayHours.closed){
      response1 = {fulfillmentText: 'Sorry we are closed today'};
    } else if ((requestHour+requestMinute/60)>=requestDayHours.closes[0] && (requestHour+requestMinute/60)<requestDayHours.opens[0]){
      response1 = {fulfillmentText: 'Sorry we are closed at ' + requestHour + ":" + requestMinute + ' today. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0]}
    } else {
      response1 = {fulfillmentText:'Yes we are open at '+ requestHour + ":" + requestMinute + ' today. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0]}
    }

  } else {
    response1 = {fulfillmentText: 'Our regular hours are: \n' + hoursText}
  }
  log.info(response1)
  console.log(response1)
  return (response1);
}

//a function to handle the cases for holiday-hour intents should not be able to get here unless the intent was holiday-hours or reg hours checked and is a holiday
async function handleHolidayHour(userID, queryResult){
  console.log('In handle holiday hour')
  log.info('In handle holiday hour')
  var response1='';
  const now = new Date();

  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();

  if (queryResult.parameters.fields.holiday === undefined){
    if(queryResult.parameters.fields.date.stringValue!==""){
      log.info('in 1st case')
      const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
      const holiday = businessHoursHelper.checkHoliday(requestDate);
      const result = await client.query('SELECT * FROM business_holiday_hours WHERE business_id = $1 AND holiday = $2',[userID, holiday]);
      await client.end()

      if (result.rows === undefined || result.rows.length ==0){
        response1 = await handleRegularHour(userID, queryResult)
        return({fulfillmentText:'For '+ holiday + ': ' + response1.fulfillmentText})
      } else {
        return({fulfillmentText:'Sorry we are closed for ' + result.rows[0].holiday})
      }

    } else if(queryResult.parameters.fields.date.stringValue==="" && queryResult.parameters.fields.time.stringValue !== ""){ //third case is if only time is obtained
      log.info('in 2nd case')
      const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
      const holiday = businessHoursHelper.checkHoliday(requestTime);
      const result = await client.query('SELECT * FROM business_holiday_hours WHERE business_id = $1 AND holiday = $2',[userID, holiday]);
      await client.end()

      if (result.rows === undefined || result.rows.length ==0){
        response1 = await handleRegularHour(userID, queryResult)
        return('For '+ holiday + ': ' + response1.fulfillmentText)
      } else {
        return({fulfillmentText:'Sorry we are closed for ' + result.rows[0].holiday})
      }

    }
  } else if (queryResult.parameters.fields.holiday != ""){
    await client.connect();
    const result = await client.query('SELECT * FROM business_holiday_hours WHERE business_id = $1 AND holiday = $2',[userID, queryResult.parameters.fields.holiday]);
    await client.end()

    if (result.rows === undefined || result.rows.length ==0){
      response1 = await handleRegularHour(userID, queryResult)
      return({fulfillmentText:'For ' + queryResult.parameters.fields.holiday + ': ' + response1.fulfillmentText})
    } else {
      return({fulfillmentText:'Sorry we are closed for ' + queryResult.parameters.fields.holiday})
    }
  } else {
    return ({fulfillmentText: 'something went wrong in handleHolidayHour'})
  }
}

async function handleLocation(userID, queryResult,sessionContextPath){
  let response1={};
  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();
  const result = await client.query('SELECT business_location FROM business_info WHERE business_id = $1',[userID]);
  await client.end()
  if(result!==undefined || result.rows.length!=0){
    response1 = {
      fulfillmentText:'We are located at ' + result.rows[0].business_location,
      contexts:queryResult.outputContexts,
      handledContextNew:sessionContextPath+'location'
    }
    return(response1)
  } else {
    response1 = {fulfillmentText:"Sorry I can't help with that as I can't seem to find the location", context:queryResult.outputContexts}
    return(response1)
  }
}

async function handleStarStatus(userID, queryResult){
  let response1={};
  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();
  const result = await client.query('SELECT star_cert FROM smogshop_info WHERE business_id = $1',[userID]);
  await client.end()
  if(result!==undefined || result.rows.length!=0){
    if(result.rows[0].star_cert){
      response1 = {fulfillmentText:'Yes we are a STAR certified station'}
      return(response1)
    } else {
      response1 = {fulfillmentText:'No we are not a STAR certified station'}
      return(response1)
    }
  } else {
    response1 = {fulfillmentText:"Sorry I can't help with that as I don't know the STAR status of this station"}
    return(response1)
  }
}

function resetContext(currentContext,handledContextNew){
  var contextToKeep = [];
  if(currentContext!=undefined){
    for(let i=0;i<currentContext.length;i++){
      if (currentContext[i].name != handledContextNew){
        contexToKeep.push(currentContext[i])
      }
    }
  }
  console.log('resetContext result: %j', currentContext )
  console.log(handledContextNew)
  return contextToKeep;
}
