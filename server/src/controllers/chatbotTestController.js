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
const googleCalendar = require('../helpers/googleCalendarHelper')

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
  const outputContexts = detectedResult.outputContexts


  if(intentName == 'hours-regular'){
    const trueRegHour = await checkRegularHour(req.body.userID, detectedResult)
    if(trueRegHour){
      const response = await handleRegularHour(req.body.userID, detectedResult)
      res.json(response);
    } else {
      const response = await handleHolidayHour(req.body.userID,detectedResult)
      res.json(response);
    }
  } else if (intentName == 'hours-holiday'){
    const response = await handleHolidayHour(req.body.userID, detectedResult)
    res.json(response);
  } else if (intentName == 'location'){
    const response1 = await handleLocation(req.body.userID, detectedResult, sessionContextPath, req.body.dialogflowProjectId, req.body.dialogflowCredentialPath, req.body.sessionID,)
    res.json(response1);
  } else if (intentName == 'star-status'){
    const response2 = await handleStarStatus(req.body.userID, detectedResult)
    res.json(response2);
  } else if (contextContains(outputContexts, sessionContextPath, 'prev-test') && intentName.includes('prev')) {
    const response3 = await handlePrevTest(req.body.userID, detectedResult, sessionContextPath, req.body.dialogflowProjectId, req.body.dialogflowCredentialPath, req.body.sessionID, req.body.userInfo)
    res.json(response3);
  } else if (intentName == 'retestPolicy'){
    const response4 = await handleRetestPolicy(req.body.userID, detectedResult, sessionContextPath)
    res.json(response4);
  } else if (contextContains(outputContexts, sessionContextPath, 'book-appointment') && intentName.includes('appointments')){
    const response5 = await handleAppointments(req.body.userID, detectedResult, sessionContextPath, req.body.dialogflowProjectId, req.body.dialogflowCredentialPath, req.body.sessionID, req.body.userInfo)
    res.json(response5);
  } else if (contextContains(outputContexts, sessionContextPath, 'car-make') && intentName.includes('car-make')){
    const response6 = await handleCar(req.body.userID, detectedResult, sessionContextPath, req.body.dialogflowProjectId, req.body.dialogflowCredentialPath, req.body.sessionID, req.body.userInfo);
    res.json(response6);
  }
  else {
    res.json(detectedResult)
  }
}

async function detectIntent(projectId, filePath, sessionId, question, contexts, handledContexts){
  console.log(filePath + ' in detectIntent')
  const sessionClient = new dialogflow.SessionsClient({
    projectId: projectId,
    keyFilename: filePath
  });
  const sessionPath = sessionClient.sessionPath(projectId, sessionId);

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

  const responses = await sessionClient.detectIntent(request);
  console.log('Detected Intent');
  const result = responses[0].queryResult;
  console.log("%j",result)
  if(result.intent){
    console.log(` Intent: ${result.intent.displayName}`)
  } else {
    console.log('No intent matched');
  }
  return(result);
}

async function deleteContext(projectId, filePath, sessionId, context){
  console.log(filePath + ' in deleteContext')
  const contextsClient = new dialogflow.ContextsClient({
    projectId: projectId,
    keyFilename: filePath
  });
  const contextPath = contextsClient.contextPath(projectId, sessionId, context);

  console.log(contextPath)
  const request = {
    name: contextPath,
  };

  // Send the request for retrieving the context.
  const result = await contextsClient.deleteContext(request);
  console.log(`Context ${contextPath} deleted`);
  return result;
}

async function createContext(projectId, filePath, sessionId, contextId) {
  // [START dialogflow_create_context]
  // Imports the Dialogflow library
  const dialogflow = require('dialogflow');

  // Instantiates clients
  const contextsClient = new dialogflow.ContextsClient();

  const sessionPath = contextsClient.sessionPath(projectId, sessionId);
  const contextPath = contextsClient.contextPath(
    projectId,
    sessionId,
    contextId
  );

  const createContextRequest = {
    parent: sessionPath,
    context: {
      name: contextPath,
      lifespanCount: 1,
    },
  };

  const responses = await contextsClient.createContext(createContextRequest);
  console.log(`Created ${responses[0].name} context`);
  // [END dialogflow_create_context]
}

//a function that checks if the date the user asked is a holiday
async function checkRegularHour(userID,queryResult){
  console.log('In check regular hour')
  log.info('In check regular hour')
  var regularHour=true;

  if(queryResult.parameters.fields.date.stringValue!==""){
    const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
    const holiday = businessHoursHelper.checkHoliday(requestDate);

    if(!holiday){
      return true
    } else {
      return false
    }
  } else if(queryResult.parameters.fields.date.stringValue==="" && queryResult.parameters.fields.time.stringValue !== ""){
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
  let now = new Date();

  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();
  let result = await client.query('SELECT * FROM business_hours WHERE business_id = $1 ORDER BY day',[userID]);
  await client.end()
  let hoursJson = businessHoursHelper.toJsonHours(result).hoursJson;
  let hoursText = businessHoursHelper.toJsonHours(result).hoursText;

  //first case is both day and time are obtained from the userUtterance
  if(queryResult.parameters.fields.date.stringValue!=="" &&queryResult.parameters.fields.time.stringValue!==""){
    console.log('in first case')
    const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
    const requestDay=requestDate.getDay();
    const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
    const requestHour = requestTime.getHours();
    const requestMinute = requestTime.getMinutes()
    const requestDayHours =  businessHoursHelper.getRegularHoursOneDay(requestDay,hoursJson);

    const openingHour = parseInt(requestDayHours.opens[0].substring(0,2),10);
    const openingMinute = parseInt(requestDayHours.opens[0].substring(3,5),10)
    const closingHour = parseInt(requestDayHours.closes[0].substring(0,2),10);
    const closingMinute = parseInt(requestDayHours.closes[0].substring(3,5),10)

    if(requestDayHours.closed){
      response1 = {fulfillmentText:'Sorry we are closed on ' + businessHoursHelper.integerToDay(requestDay)};
    } else if ((requestHour+requestMinute/60)<(closingHour+closingMinute/60) && (requestHour+requestMinute/60)>(openingHour+openingMinute/60)){
      response1 = {fulfillmentText:'We are open at '+ requestHour + ":" + requestMinute + ' on ' + businessHoursHelper.integerToDay(requestDay)}
    } else {
      response1 = {fulfillmentText: 'Sorry we are closed at ' + requestHour + ":" + requestMinute + ' on ' + businessHoursHelper.integerToDay(requestDay)}
    }

  } else if(queryResult.parameters.fields.date.stringValue!=="" && queryResult.parameters.fields.time.stringValue === ""){ // second case is if only day is obtained
    console.log('in second case')
    const requestDate=new Date(queryResult.parameters.fields.date.stringValue);
    const requestDay=requestDate.getDay();
    const requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay,hoursJson);

    if (requestDayHours.closed){
      response1 = {fulfillmentText: 'Sorry we are closed on ' + businessHoursHelper.integerToDay(requestDay)};
    } else {
      response1 = {fulfillmentText:'We are open on ' + businessHoursHelper.integerToDay(requestDay) + '. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0] + ' on ' + businessHoursHelper.integerToDay(requestDay)}
    }

  } else if(queryResult.parameters.fields.date.stringValue==="" && queryResult.parameters.fields.time.stringValue !== ""){ //third case is if only time is obtained
    console.log('in third case')
    const requestTime=new Date(queryResult.parameters.fields.time.stringValue);
    const requestDay = requestTime.getDay()
    const requestHour = requestTime.getHours();
    const requestMinute = requestTime.getMinutes()
    const requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay,hoursJson);
    const holiday = businessHoursHelper.checkHoliday(requestTime);

    const openingHour = parseInt(requestDayHours.opens[0].substring(0,2),10);
    const openingMinute = parseInt(requestDayHours.opens[0].substring(3,5),10)
    const closingHour = parseInt(requestDayHours.closes[0].substring(0,2),10);
    const closingMinute = parseInt(requestDayHours.closes[0].substring(3,5),10);

    if (requestDayHours.closed){
      response1 = {fulfillmentText: 'Sorry we are closed today'};
    } else if ((requestHour+requestMinute/60)>=(closingHour+closingMinute/60) || (requestHour+requestMinute/60)<(openingHour+openingMinute/60)){
      response1 = {fulfillmentText: 'Sorry we are closed at ' + requestHour + ":" + requestMinute + ' today. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0]}
    } else {
      response1 = {fulfillmentText:'Yes we are open at '+ requestHour + ":" + requestMinute + ' today. Our regular hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0]}
    }

  } else if(queryResult.parameters.fields['date-period'].structValue != undefined){
    console.log('in fourth case')
    let datePeriod = {startDate:new Date(queryResult.parameters.fields['date-period'].structValue.fields.startDate.stringValue), endDate:new Date(queryResult.parameters.fields['date-period'].structValue.fields.endDate.stringValue)}
    let dateArray = businessHoursHelper.getDatesBetween(datePeriod.startDate, datePeriod.endDate);
    if(dateArray.length<=7){
      let openDays = [];
      let closedDays = [];
      dateArray.map(date1=>{
        var requestDay = date1.getDay()
        var requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay, hoursJson);
        if (requestDayHours.closed){
          closedDays.push(businessHoursHelper.integerToDay(requestDay))
        }else {
          openDays.push(businessHoursHelper.integerToDay(requestDay))
        }
      })
      var openText
      var closedText
      if (openDays.length>0){
        openText = 'We are open on ';
        openDays.map((openDay, i)=>{
          if(openDays.length== i+1){
            openText = openText + openDay + '. '
          } else {
            openText = openText + openDay + ', '
          }
        });
      }
      if(closedDays.length>0){
        closedText = 'We are closed on ';
        closedDays.map((closedDay, i) =>{
          if(closedDays.length == i+1 ){
            closedText = closedText + closedDay + '. '
          } else {
            closedText = closedText + closedDay + ', '
          }
        });
      }
      response1 = {fulfillmentText: openText + closedText}
    } else{
      response1 = {fulfillmentText: 'Which day would you like to know?'}
    }
  } else{
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

async function handleLocation(userID, queryResult, sessionContextPath, projectId, credentialPath, sessionId){
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
    await deleteContext(projectId, credentialPath, sessionId, 'location')
    return(response1)
  } else {
    response1 = {fulfillmentText:"Sorry I can't help with that as I can't seem to find the location", context:queryResult.outputContexts}
    await deleteContext(projectId, credentialPath, sessionId, 'location')
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

async function handlePrevTest(userID, queryResult, sessionContextPath, projectId, credentialPath, sessionId, userInfo){
  //return({fulfillmentText:'not done yet'});

  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();
  const result = await client.query('SELECT * FROM smogshop_service WHERE business_id = $1',[userID]);
  await client.end()

  //console.log('%j',queryResult)

  var relativeLocation = userInfo.prevTest.relativeLocation;
  var date = userInfo.prevTest.date;
  var dateRange = userInfo.prevTest.dateRange;
  var passFail = userInfo.prevTest.passFail;

  if(queryResult.intent.displayName=='prev-fail-test-here'){ // handling confirmation if the test is done here
    if (queryResult.parameters.fields.confirmation.stringValue =='Yes'){
      relativeLocation = 'here';
    } else if (queryResult.parameters.fields.confirmation.stringValue == 'No'){
      let response = {
        fulfillmentText:"OK if you had it tested elsewhere, we won't be able to do a free retest. What can I help with today?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
        handledContextNew:sessionContextPath+'prev-test'
      }
      await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
      return(response)
    }
  }

  if(queryResult.intent.displayName=='prev-test-pass-fail-confirm'){ //handling confirmation if the test failed
    if (queryResult.parameters.fields.confirmation.stringValue =='Yes'){
      passFail = 'fail';
    } else if (queryResult.parameters.fields.confirmation.stringValue == 'No'){
      let response = {
        fulfillmentText:"Good to see the test was fine. What can I help with today?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
        handledContextNew:sessionContextPath+'prev-test'
      }
      await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
      return(response)
    }
  }

  //update the variables
  relativeLocation = prevTestUpdateUserInfo(relativeLocation, date, dateRange, passFail, queryResult.parameters.fields['relative-location'], queryResult.parameters.fields.date, queryResult.parameters.fields['date-period'], queryResult.parameters.fields['pass-fail']).relativeLocation;
  date = prevTestUpdateUserInfo(relativeLocation, date, dateRange, passFail, queryResult.parameters.fields['relative-location'], queryResult.parameters.fields.date, queryResult.parameters.fields['date-period'], queryResult.parameters.fields['pass-fail']).date;
  dateRange= prevTestUpdateUserInfo(relativeLocation, date, dateRange, passFail, queryResult.parameters.fields['relative-location'], queryResult.parameters.fields.date, queryResult.parameters.fields['date-period'], queryResult.parameters.fields['pass-fail']).dateRange;
  passFail = prevTestUpdateUserInfo(relativeLocation, date, dateRange, passFail, queryResult.parameters.fields['relative-location'], queryResult.parameters.fields.date, queryResult.parameters.fields['date-period'], queryResult.parameters.fields['pass-fail']).passFail;
  console.log('location: '+relativeLocation)
  console.log('date: '+ date)
  console.log('dateRange: ' + dateRange)
  console.log('passfail: ' +passFail)

  //first check if there is any retest policies for the business
  if(result==undefined||result.rows.length==0){ //no info on business having retest
    if(relativeLocation=='here'&& passFail=='fail'){
      let response = {
        fulfillmentText:"Sorry I don't know the policies regarding previous tests or visits please call. What else can I help with today?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
        handledContextNew:sessionContextPath+'prev-test'
      }
      await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
      return(reponse)
    } else if (passFail == 'fail'){
      let response = {
        fulfillmentText:"Sorry to hear your test failed, how may I help?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
      }
      return(reponse)
    } else {
      let response = {
        fulfillmentText:"Glad to hear you were here, how may I help?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts
      }
      return(reponse)
    }
  }

  //if business doesn't offer retest
  if(!result.rows[0].free_retest){
    if(relativeLocation=='here'&& passFail=='fail'){
      let response = {
        fulfillmentText:"Sorry it seems we do not offer free retest, how else can I help?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
        handledContextNew:sessionContextPath+'prev-test',
      }
      await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
      return(reponse)
    } else if (passFail == 'fail'){
      let response = {
        fulfillmentText:"Sorry to hear your test failed, how may I help?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
      }
      return(reponse)
    } else {
      let response = {
        fulfillmentText:"I am glad to hear you were here, how may I help?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
      }
      return(response)
    }
  } else if(result.rows[0].free_retest){ //if business does offer retest
    console.log('in case where retest offered')
    const today = new Date();
    if(relativeLocation =='here'&& (date!=''||dateRange!='') && passFail=='fail'){
      if(date!=''){ //if the date field isn't empty
        const testDate = new Date(date);
        console.log(today-testDate);
        if(daysBetween(today,testDate)<result.rows[0].retest_days){ //if the test date is less than retest days
          let response = {
            fulfillmentText:"We can do a free retest for you. Our policy is any failed smog check completed within the last "+ result.rows[0].retest_days + ' days are eligible for a free retest so be sure to come in before then!',
            prevTest:{
              relativeLocation:relativeLocation,
              date:date,
              dateRange:dateRange,
              passFail:passFail,
            },
            contexts:queryResult.outputContexts,
            handledContextNew:sessionContextPath+'prev-test'
          }
          await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
          return(response)
        } else { //if the test date is more than retest days
          let response = {
            fulfillmentText:"Sorry, our free retest policy is the last test must be completed within "+ result.rows[0].retest_days + ' days. How else may I help?',
            prevTest:{
              relativeLocation:relativeLocation,
              date:date,
              dateRange:dateRange,
              passFail:passFail,
            },
            contexts:queryResult.outputContexts,
            handledContextNew:sessionContextPath+'prev-test'
          }
          await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
          return(response)
        }
      } else { // datefield empty but the date range isnt empty
        const startDay = new Date(dateRange.startDate);
        const endDay = new Date(dateRange.endDate);
        if(daysBetween(today,startDay)<result.rows[0].retest_days){//the earlest date in the range is less than retest days
          let response = {
            fulfillmentText:"We can do a free retest for you. Our policy is any failed smog check completed within the last "+ result.rows[0].retest_days + ' days are eligible for a free retest so be sure to come in before then!',
            prevTest:{
              relativeLocation:relativeLocation,
              date:date,
              dateRange:dateRange,
              passFail:passFail,
            },
            contexts:queryResult.outputContexts,
            handledContextNew:sessionContextPath+'prev-test'
          }
          await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
          return(response)
        } else if(daysBetween(today,endDay)>result.rows[0].retest_days){ //the latest date in the range is more than retest days
          let response = {
            fulfillmentText:"Sorry, our free retest policy is the last test must be completed within "+ result.rows[0].retest_days + ' days. How else may I help?',
            prevTest:{
              relativeLocation:relativeLocation,
              date:date,
              dateRange:dateRange,
              passFail:passFail,
            },
            contexts:queryResult.outputContexts,
            handledContextNew:sessionContextPath+'prev-test'
          }
          await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
          return(response)
        } else { // the retest day is somewhere in the middle of the range
          let response = {
            fulfillmentText:"What is the exact date of your test? ",
            prevTest:{
              relativeLocation:relativeLocation,
              date:date,
              dateRange:dateRange,
              passFail:passFail,
            },
            contexts:queryResult.outputContexts,
          }
          await await createContext(projectId, credentialPath, sessionId, 'prev-test-date-confirm')
          return(response)
        }
      }
    } else if (relativeLocation==''){ //if location field isn't filled out
      let response = {
        fulfillmentText:"Did you the smog check here?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
      }
      await createContext(projectId, credentialPath, sessionId, 'prev-test-location-confirm')
      return(response)
    } else if (passFail ==''){ //passFail informaion isn't filled out
      let response = {
        fulfillmentText:"Did the test fail?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
      }
      await createContext(projectId, credentialPath, sessionId, 'prev-test-fail-confirm')
      return(response)
    } else if (date==''&& dateRange==''){ //the only other else is date and daterange are all empty
      let response = {
        fulfillmentText:"What is the exact date of your test? ",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
      }
      await createContext(projectId, credentialPath, sessionId, 'prev-test-date-confirm')
      return(response)
    } else {
      let response = {
        fulfillmentText:"Looks like you didn't get the last test done here. What can I help with today?",
        prevTest:{
          relativeLocation:relativeLocation,
          date:date,
          dateRange:dateRange,
          passFail:passFail,
        },
        contexts:queryResult.outputContexts,
        handledContextNew:sessionContextPath+'prev-test',
      }
      await deleteContext(projectId, credentialPath, sessionId, 'prev-test')
      return(response)
    }
  }
}

async function handleRetestPolicy(userID, queryResult, sessionContextPath){
  let response1={};
  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();
  const result = await client.query('SELECT * FROM smogshop_service WHERE business_id = $1',[userID]);
  await client.end()

  //first check if there is any retest policies for the business
  if(result==undefined||result.rows.length==0){ //no info on business having retest
    let response = {
      fulfillmentText:"Sorry I don't know the policies regarding previous tests or visits please call. What else can I help with today?",
      contexts:queryResult.outputContexts,
    }
    return(response)
  } else {
    if(result.rows[0].free_retest){
      let response = {
        fulfillmentText:"We offer free retest within "+result.rows[0].retest_days + " days of the original test",
        contexts:queryResult.outputContexts,
      }
      return(response)
    } else {
      let response = {
        fulfillmentText:"Sorry we do not offer a free retest",
        contexts:queryResult.outputContexts,
      }
      return(response)
    }
  }
}

async function handleAppointments(userID, queryResult, sessionContextPath, projectId, credentialPath, sessionId, userInfo){

  var client = new pg.Client({
    connectionString: databaseURL
  });
  await client.connect();
  const result = await client.query('SELECT * FROM business_hours WHERE business_id = $1 ORDER BY day',[userID]);
  await client.end()
  let hoursJson = businessHoursHelper.toJsonHours(result).hoursJson;
  let hoursText = businessHoursHelper.toJsonHours(result).hoursText;

  let time = userInfo.appointment.time;
  let date = userInfo.appointment.date;
  let dateRange = userInfo.appointment.dateRange;
  let response;

  time = appointmentUpdateUserInfo(time, date, dateRange, queryResult.parameters.fields.time, queryResult.parameters.fields.date, queryResult.parameters.fields['date-period']).time;
  date = appointmentUpdateUserInfo(time, date, dateRange, queryResult.parameters.fields.time, queryResult.parameters.fields.date, queryResult.parameters.fields['date-period']).date;
  dateRange = appointmentUpdateUserInfo(time, date, dateRange, queryResult.parameters.fields.time, queryResult.parameters.fields.date, queryResult.parameters.fields['date-period']).dateRange;

  if(time=='' && date ==''){ // if no specifc time or date obtained from the utterance
    if(dateRange !=''){ // if a range of dates is obtained from the utterance
      await createContext(projectId, credentialPath, sessionId, 'book-appointment-time');
      let datePeriod = {startDate:new Date(dateRange.startDate), endDate:new Date(dateRange.endDate)}
      let dateArray = businessHoursHelper.getDatesBetween(datePeriod.startDate, datePeriod.endDate);
      if(dateArray.length<=7){ // check if the number of dates less than 7.
        let openDays = [];
        let closedDays = [];
        dateArray.map(date1=>{
          var requestDay = date1.getDay()
          var requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay, hoursJson);
          if (requestDayHours.closed){
            closedDays.push(businessHoursHelper.integerToDay(requestDay))
          }else {
            openDays.push(businessHoursHelper.integerToDay(requestDay))
          }
        })
        let openText
        let closedText
        if (openDays.length>0){
          openText = 'We are open on ';
          openDays.map((openDay, i)=>{
            if(openDays.length== i+1){
              openText = openText + openDay + '. '
            } else {
              openText = openText + openDay + ', '
            }
          });
        }
        if(closedDays.length>0){
          closedText = 'We are closed on ';
          closedDays.map((closedDay, i) =>{
            if(closedDays.length == i+1 ){
              closedText = closedText + closedDay + '. '
            } else {
              closedText = closedText + closedDay + ', '
            }
          });
        }
        if(openDays.length == dateArray.length){// if all days of the request are open
          response = {
            fulfillmentText: 'Sure, which date and time would you like to book?',
            context:queryResult.outputContexts,
            appointment:{
              time:time,
              date:date,
              dateRange:dateRange,
            }
          }
        } else if (closedDays.length = dateArray.length){// if none of the days of the request is open
          response = {
            fulfillmentText:'Sorry we are closed those days. Which other date and time works for you?',
            context:queryResult.outputContexts,
            appointment:{
              time:time,
              date:date,
              dateRange:dateRange,
            }
          }
        } else { //if only some of the days of the request is open. specify which days are open and ask which day for booking
          await createContext(projectId, credentialPath, sessionId, 'book-appointment-time')
          response = {
            fulfillmentText: openText + closedText + 'which day would you like to book?',
            context:queryResult.outputContexts,
            appointment:{
              time:time,
              date:date,
              dateRange:dateRange,
            }
          }
        }
      }
    } else {// if nothing regarding dates have been obtained.
      await createContext(projectId, credentialPath, sessionId, 'book-appointment-time');
      response = {
        fulfillmentText:'Which date and time would you like the reservation?',
        context:queryResult.outputContexts,
        appointment:{
          time:time,
          date:date,
          dateRange:dateRange,
        }
      }
    }
  } else if (time ==''){ // if date is obtained but no time
    let requestDay = new Date(date).getDay();
    let requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay, hoursJson);

    await createContext(projectId, credentialPath, sessionId, 'book-appointment-time');

    if(requestDayHours.closed){ //if the day of the request is closed
      response = {
        fulfillmentText:'Sorry we are closed that day, which other date and time would work for you?',
        context:queryResult.outputContexts,
        appointment:{
          time:time,
          date:date,
          dateRange:dateRange,
        }
      }
    } else { //if the day of the request is open
      await createContext(projectId, credentialPath, sessionId, 'book-appointment-time')
      response = {
        fulfillmentText:'What time on '+businessHoursHelper.integerToDay(requestDay)+' would you like to book?',
        context:queryResult.outputContexts,
        appointment:{
          time:time,
          date:date,
          dateRange:dateRange,
        }
      }
    }
  } else { //if time is obtained. Date might not necessarily be obtained yet
    let requestTime = new Date(time)
    let requestHour = requestTime.getHours();
    let requestMinute = requestTime.getMinutes();
    let requestTimeString = businessHoursHelper.colloquializeTime(requestHour, requestMinute);
    let requestDay
    if (date != ''){
      requestDay = new Date(date).getDay();
    } else {
      requestDay = requestTime.getDay();
    }
    let requestDayHours = businessHoursHelper.getRegularHoursOneDay(requestDay, hoursJson);
    if(requestDayHours.closed){ //if the date requested is closed
      await createContext(projectId, credentialPath, sessionId, 'book-appointment-time');
      response = {
        fulfillmentText:'Sorry we are closed that day, which other date and time would work for you?',
        context:queryResult.outputContexts,
        appointment:{
          time:time,
          date:date,
          dateRange:dateRange,
        }
      }
    } else { // if the date is open
      if(businessHoursHelper.checkOpen(requestHour, requestMinute, requestDayHours)){
        let appointments = await googleCalendar.listAppointmentAt(time, 30);
        if(appointments.length == 0){ //if there is no appointment at the requested time
          //need to check if the car information is received.
          if(userInfo.car.year !='' && (userInfo.car.type!='' || userInfo.car.utterance!='' || userInfo.car.model!='')){ //if car info is available
            userInfo.appointment.time = time;
            userInfo.appointment.date = date;
            userInfo.appointment.dateRange = dateRange;
            googleCalendar.insertAppointment(userInfo)
            await deleteContext (projectId, credentialPath, sessionId, 'book-appointment')
            response={
              fulfillmentText:"Great, you are booked for " + requestTimeString + ' on ' + businessHoursHelper.integerToDay(requestDay),
              context:queryResult.outputContexts,
              appointment:{
                time:time,
                date:date,
                dateRange:dateRange,
              }
            }
          } else if (userInfo.car.year=='' && (userInfo.car.type!='' || userInfo.car.utterance!='' || userInfo.car.model!='')){//if car info is available but just the year isn't
            await createContext(projectId, credentialPath, sessionId, 'car-make-year')
            response = {
              fulfillmentText: 'What year is your car?',
              context:queryResult.outputContexts,
              appointment:{
                time:time,
                date:date,
                dateRange:dateRange,
              }
            }
          } else { //if no car info available at all.
            response = {
              fulfillmentText:'Can you let us know what type of car you have and what year is it?',
              contexts:queryResult.outputContexts,
              appointment:{
                time:time,
                date:date,
                dateRange:dateRange,
              },
            }
          }
        } else { // if there is an appointment already
          await createContext(projectId, credentialPath, sessionId, 'book-appointment-time')
          response = {
            fulfillmentText:"Sorry looks like there is an appointment already at " + requestTimeString + ' on ' + businessHoursHelper.integerToDay(requestDay),
            contexts:queryResult.outputContexts,
            appointment:{
              time:time,
              date:date,
              dateRange:dateRange,
            },
          }
        }
      } else {
        await createContext(projectId, credentialPath, sessionId, 'book-appointment-time')
        response = {
          fulfillmentText:'Sorry we are closed at '+requestTimeString + '. Our hours are ' + requestDayHours.opens[0] + ' to ' + requestDayHours.closes[0] + ' on ' + businessHoursHelper.integerToDay(requestDay) + '. What other times are you available?',
          contexts:queryResult.outputContext,
          appointment:{
            time:time,
            date:date,
            dateRange:dateRange,
          }
        }
      }
    }
  }
  return(response)
}

async function handleCar(userID, queryResult, sessionContextPath, projectId, credentialPath, sessionId, userInfo){
  let type = userInfo.car.type;
  let model = userInfo.car.model;
  let year = userInfo.car.year;
  let utterance = userInfo.car.utterance;
  let response;

  type = carUpdateUserInfo(type, model, year, utterance, queryResult.parameters.fields.carType, queryResult.parameters.fields.carMake, queryResult.parameters.fields.number, queryResult.parameters.queryText).type;
  model = carUpdateUserInfo(type, model, year, utterance, queryResult.parameters.fields.carType, queryResult.parameters.fields.carMake, queryResult.parameters.fields.number, queryResult.parameters.queryText).model;
  year = carUpdateUserInfo(type, model, year, utterance, queryResult.parameters.fields.carType, queryResult.parameters.fields.carMake, queryResult.parameters.fields.number, queryResult.parameters.queryText).year;
  utterance = carUpdateUserInfo(type, model, year, utterance, queryResult.parameters.fields.carType, queryResult.parameters.fields.carMake, queryResult.parameters.fields.number, queryResult.parameters.queryText).utterance;

  if(year==''){
    await createContext(projectId, credentialPath, sessionId, 'car-make-year');
    response={
      fulfillmentText:'What year is your vehicle?',
      context:queryResult.outputContexts,
      car:{
        type:type,
        model:model,
        year:year,
        utterance:utterance,
      }
    }
  } else if(userInfo.appointment.time!=''){
    await deleteContext(projectId, credentialPath, sessionId, 'car-make');
    await deleteContext(projectId, credentialPath, sessionId, 'book-appointment');
    googleCalendar.insertAppointment(userInfo);
    response={
      fulfillmentText:"Great, you are all booked",
      context:queryResult.outputContexts,
      car:{
        type:type,
        model:model,
        year:year,
        utterance:utterance,
      }
    }
  } else {
    response={
      fulfillmentText:"Thanks, how can I help?",
      context:queryResult.outputContexts,
      car:{
        type:type,
        model:model,
        year:year,
        utterance:utterance,
      }
    }
  }

  return(response)
}

function resetContext(currentContext,handledContextNew){
  var contextToKeep = [];
  if(currentContext!=undefined && handledContextNew != undefined){
    for(let i=0;i<currentContext.length;i++){
      if (currentContext[i].name != handledContextNew){
        contextToKeep.push(currentContext[i])
      }
    }
  }
  console.log('resetContext result: %j', currentContext )
  console.log(handledContextNew)
  return contextToKeep;
}

function prevTestUpdateUserInfo(relativeLocation, date, dateRange, passFail, newRelLocation, newDate, newDateRange, newPassFail){
  if(newRelLocation!=undefined && newRelLocation.stringValue != ''){
    relativeLocation = newRelLocation.stringValue;
  }
  if(newDate != undefined && newDate.stringValue != ''){
    date = newDate.stringValue;
  }
  if(newDateRange != undefined && newDateRange.structValue !=undefined){
    dateRange = {startDate:newDateRange.structValue.fields.startDate.stringValue, endDate:newDateRange.structValue.fields.endDate.stringValue};
  }
  if(newPassFail!=undefined && newPassFail.stringValue != ''){
    passFail = newPassFail.stringValue;
  }
  return{relativeLocation:relativeLocation, date:date, dateRange:dateRange, passFail:passFail}
}

function appointmentUpdateUserInfo(time, date, dateRange, newTime, newDate, newDateRange){
  if(newTime != undefined && newTime.stringValue !=''){
    time = newTime.stringValue;
  }
  if(newDate != undefined && newDate.stringValue !=''){
    date = newDate.stringValue;
  }
  if(newDateRange != undefined && newDateRange.structValue != undefined){
    dateRange = {startDate:newDateRange.structValue.fields.startDate.stringValue, endDate:newDateRange.structValue.fields.endDate.stringValue};
  }
  return{time:time, date:date, dateRange:dateRange}
}

function carUpdateUserInfo(type, model, year, utterance, newType, newModel, newYear, newUtterance){
  if(newType != undefined && newType.stringValue !=''){
    type = newType.stringValue;
  }
  if(newModel != undefined && newModel.stringValue !=''){
    model = newModel.stringValue;
  }
  if(newYear != undefined && newYear.stringValue !=''){
    year = newYear.numberValue;
  }
  if((newType == undefined || newType.stringValue =='') && (newModel == undefined || newModel.stringValue =='')){
    utterance=newUtterance;
  }
  return{type:type, model:model, year:year, utterance:utterance}
}

function contextContains(contexts, contextSessionPath, contextId){
  var contains = false;
  const contextToCheck = contextSessionPath+contextId
  for(let i=0;i<contexts.length;i++){
    if(contexts[i].name == contextToCheck){
      contains = true;
    }
  }
  return(contains)
}

function daysBetween(date1, date2) {

    // The number of milliseconds in one day
    var oneDay = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = Math.abs(date1_ms - date2_ms);

    // Convert back to days and return
    return Math.round(difference_ms/oneDay);

}
