var express = require('express');

module.exports = {
  router: () => {
    var router = express.Router();

    router.route('/')
      .get((req, res) => {
        res.json({
          status: 'Running!'
        });
      });

    return router;
  }
};
