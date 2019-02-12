const _ = require('underscore');
const env = require('../env');
const log = require('../log');
const handler = require('./handlerController');
const uuidv4 = require('uuid/v4');
var pg = require('pg');
pg.defaults.ssl = true;

var databaseURL = env.databaseURI;

//get all business categories
exports.getBusinessCategory = function(req,res){
  log.info('getBusinessCategory is called')
  console.log('getBusinessCategory is called')
  var client = new pg.Client({
    connectionString: databaseURL
  });
  client.connect();
  console.log(databaseURL)
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
}
