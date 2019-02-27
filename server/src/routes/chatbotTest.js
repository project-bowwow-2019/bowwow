var express = require('express');
var chatbot = require('../controllers/chatbotTestController');
var bodyParser = require('body-parser');

module.exports = {
  router: () => {
    var router = express.Router();

    router.use('/', bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));

    router.use('/', chatbot.checkRequest);
    router.use('/', chatbot.getAgent);
    router.use('/', chatbot.getAgentCredentials);
    router.use('/', chatbot.findResponse);

    return router;
  }
};
