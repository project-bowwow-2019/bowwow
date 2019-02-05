var express = require('express');
var chatBot = require('../controllers/botkitController');
var bodyParser = require('body-parser');

module.exports = {
  router: () => {
    var router = express.Router();

    router.use('/', bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));

    router.use('/', chatBot.makeConversation);

    return router;
  }
};
