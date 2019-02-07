var express = require('express');
var chatbot = require('../controllers/chatbotController');
var bodyParser = require('body-parser');

module.exports = {
  router: () => {
    var router = express.Router();

    router.use('/', bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));

    router.use('/', chatbot.checkRequest);
    router.use('/', chatbot.detectIntent);

    return router;
  }
};
