'use strict';

var _ = require('underscore');
var log = require('../log');
var uuid = require('uuid');

module.exports = {
  requestLogging,
  correlationId
};

function requestLogging (req, res, next) {
  // Log all but /livecheck requests.
  if (req.originalUrl !== '/livecheck') {
    // Remove empty objects/strings/arrays.
    const obj = _.omit({
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      query: req.query,
      body: req.body,
      correlationId: req.id
    }, _.isEmpty);

    log.info(obj, 'API request');
  }

  next();
}

function correlationId (req, res, next) {
  req.id = uuid.v4();
  res.setHeader('X-Request-Id', req.id);

  next();
}
