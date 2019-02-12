var express = require('express');
var chatbotCreate = require('../controllers/chatbotCreateController');
var bodyParser = require('body-parser');

module.exports = {
  router: () => {
    var router = express.Router();

    router.use('/', bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));

    router.get('/getCategory', chatbotCreate.getBusinessCategory);

    return router;
  }
};
