const _ = require('underscore');
const env = require('../env');
const log = require('../log');
const handler = require('./handlerController');
const uuidv4 = require('uuid/v4');
var pg = require('pg');
const path = require('path');
const dialogflow = require('dialogflow');

pg.defaults.ssl = true;


const databaseURL = env.databaseURI;
const appRoot = path.join(__dirname,'../../../')

//get all business categories
exports.getBusinessCategory = function(req,res){

  log.info('getBusinessCategory is called')
  var client = new pg.Client({
    connectionString: databaseURL
  });
  client.connect();
  let businessCategory;
  client.query('SELECT DISTINCT category FROM business_type')
  .then(result=>{
    businessCategory = result.rows;
    res.json(businessCategory);
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

//get all subtypes of the business category specified in the query.
//query param of "businessCategory" needed in the req.auery object
exports.getBusinessSubtype = function(req,res){
  var businessCategory = req.query.businessCategory;
  log.info('getBusinessSubtype is called with' + businessCategory)
  var client = new pg.Client({
    connectionString: databaseURL
  });
  client.connect();
  client.query('SELECT subtype FROM business_type WHERE category = $1', [businessCategory])
  .then(result=>{
    businessSubtype = result.rows;
    res.json(businessSubtype);
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

//get all common questions based on the business category and subtype
//parameters req.query.businessCategory and req.query.businessSubtype needed
exports.getCommonQuestions = function(req, res){
  var businessCategory = req.query.businessCategory;
  var businessSubtype = req.query.businessSubtype;

  log.info('getCommonQeustions is called with '+ businessCategory + ' and ' + businessSubtype)

  var client = new pg.Client({
    connectionString:databaseURL
  });
  client.connect();
  client.query('SELECT common_questions, intent FROM common_chats WHERE business_category=$1 AND business_subtype=$2',[businessCategory,businessSubtype])
  .then(result=>{
    commonQuestions = result.rows;
    res.json(commonQuestions);
  })
  .catch(err=>{
    log.info(err);
    if (err.statusCode>=100 && err.statusCode<600) {
      res.status(err.statusCode).json(err);
    } else {
      res.status(500).json(err);
    }
  })
  .then(()=>client.end());
}

//check if the userID is used already in the business_info business_intent_table
exports.checkUserID = function(req,res,next){
  const userID = req.body.userID;
  log.info('checkUserID is called for userID: ' + userID);

  var client = new pg.Client({
    connectionString: databaseURL
  });
  client.connect();

  const queryForID= 'SELECT business_id FROM business_info WHERE business_id = $1'

  client.query(queryForID,[userID])
  .then(result=>{
    if (result.rows.length === 0){
      req.body.isDuplicate = false;
    } else {
      req.body.isDuplicate = true;
      res.json({message:'Looks like this ID has been used, have you made on before or you can get a new ID'})
    }
  })
  .catch(err=>{
    log.info(err);
    if (err.statusCode>=100 && err.statusCode<600) {
      res.status(err.statusCode).json(err);
    } else {
      res.status(500).json(err);
    }
  })
  .then(()=>{
    client.end()
    log.info('userID checked and isDuplicate is: '+ req.body.isDuplicate)
    next();
  });
}

exports.postUserChats = async function(req, res){
  const commonIntentResponses = req.body.userResponses;
  const customQuestions = req.body.customQuestions;
  const userID = req.body.userID;
  const businessType = req.body.businessType;
  const isDuplicate = req.body.isDuplicate;

  console.log(req.body)

  log.info('postUserChats is called for userID: ' + userID + ' for a ' + businessType.subtype + ' business and duplicate is: ' + isDuplicate)

  if(!isDuplicate){
    var client = new pg.Client({
      connectionString: databaseURL
    });
    client.connect();

    //find the agent the business is supposed to have

    var agentName;
    const querySelectAgent = 'SELECT agent FROM business_type WHERE category = $1 AND subtype = $2';
    const selectAgentValues = [businessType.category, businessType.subtype];
    client.query(querySelectAgent, selectAgentValues)
    .then(result=>{
      if(result.rows.length>1){
        log.info('more than 1 agent is selected, something is wrong, check database!')
        res.status(500).json('more than 1 agent selected some how');
      }else if(result.rows.length<1){
        log.info('no agent is selected, something is wrong, check database!')
        res.status(500).json('no agent selected some how');
      } else {
        agentName = result.rows[0].agent;
        log.info(agentName + ' is selected');
      }
    })
    .catch(err => {
      log.info('error at query agent name, error: ' + err);
      if (err.statusCode>=100 && err.statusCode<600) {
        res.status(err.statusCode).json(err);
      } else {
        res.status(500).json(err);
      }
    })

    //insert the busines information into business_info table
    const queryInsertInfo= 'INSERT INTO business_info(business_id, business_category, business_subtype, subscription_type, business_agent) VALUES ($1, $2, $3, $4, $5)';
    const infoValues = [userID, businessType.category, businessType.subtype, 'trial', agentName]
    client.query(queryInsertInfo, infoValues)
    .then(result=>{
      log.info('business info entered');
    })
    .catch(err => {
      log.info('error at insert business info, error: ' + err);
      if (err.statusCode>=100 && err.statusCode<600) {
        res.status(err.statusCode).json(err);
      } else {
        res.status(500).json(err);
      }
    })

    //insert the common questions into business_intent_table
    //first need to make an array of values to insert
    if(req.body.commonQuestionsDone){
      var valuesMatrix=[];
      for(i=0;i<commonIntentResponses.length;i++){
        var rowValue = [userID,commonIntentResponses[i].intent, commonIntentResponses[i].userResponse]
        valuesMatrix.push(rowValue)
      }
      console.log(valuesMatrix)

      //with help of the helper functions, insert multiple rows at once
      const queryInsertIntent = `INSERT INTO business_intent_table(business_id, detected_intent, response) VALUES ${expand(valuesMatrix.length,valuesMatrix[0].length)}`;
      const insertValues = flatten(valuesMatrix);
      client.query(queryInsertIntent, insertValues)
      .then(result=>{
        log.info('common intents entered: ' + result.rows[0]);
      })
      .catch(err => {
        log.info('error at common intents insert, error: ' + err);
        if (err.statusCode>=100 && err.statusCode<600) {
          res.status(err.statusCode).json(err);
        } else {
          res.status(500).json(err);
        }
      })
    }

    //put in the custom questions into the business intent table
    //first need to check if any of the custom questions already match an intent
    //if the intent is matched through dialogflow, the intent and the response will be added to intent tabel
    //if the intent is not deteced, the new question need to be added to the agent and a "random" intent
    //name needs to be assigned to the agent, this intent name and the resopnse then go into the intent table
    if(req.body.customQuestionsDone){
      var dialogflowProjectId;
      var dialogflowCredentialPath;

      const queryAgentInfo = 'SELECT TOP 1 * FROM dialogflow_agent WHERE agent = $1';
      const queryAgentInfoValues = [agentName];

      client.query(queryAgentInfo, queryAgentInfoValues)
      .then(result=>{
        log.info(result.rows[0].project_id + ' is selected');
        dialogflowProjectId=result.rows[0].project_id;
        dialogflowCredentialPath = path.join(appRoot,result.rows[0].credential_path);
        console.log(dialogflowCredentialPath)
      })
      .catch(err=>{
        log.info('error at query agent name, ' + err);
        if (err.statusCode>=100 && err.statusCode<600) {
          res.status(err.statusCode).json(err);
        } else {
          res.status(500).json(err);
        }
      })

      var valuesMatrix=[];
      for(i=0;i<customQuestions.length;i++){
        //send the question to dialogflow

      }

    }
  }
}



// expand(3, 2) returns "($1, $2), ($3, $4), ($5, $6)"
function expand(rowCount, columnCount, startAt=1){
  var index = startAt;
  return Array(rowCount).fill(0).map(v => `(${Array(columnCount).fill(0).map(v => `$${index++}`).join(", ")})`).join(", ")
}

// flatten([[1, 2], [3, 4]]) returns [1, 2, 3, 4]
function flatten(arr){
  var newArr = []
  arr.forEach(v => v.forEach(p => newArr.push(p)))
  return newArr
}

async function detectIntent(projectId, filePath, userId, question){
  const sessionClient = new dialogflow.SessionsClient({
    projectId: projectId,
    keyFileName: filePath
  });
  const sessionPath = sessionClient.sessionPath(projectId, userId);

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
  console.log(`Query: ${result.queryText}`);
  console.log(`Response: ${result.fulfillmentText}`);
  if(result.intent){
    console.log(` Intent: ${result.intent.displayName}`);
  } else {
    console.log('No intent matched');
  }
  return(result.intent.displayName);
}
