const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = createApp();

function createApp () {
  const errorFile = fs.createWriteStream('logs/errors.log', { flags: 'a' });
  process.__defineGetter__('stderr', () => {
    return errorFile;
  });

  const buildPath = path.join(__dirname, '../../', 'build');

  const app = express();

  app.use('/', express.static(buildPath));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use('*', handler.requestLogging);

  app.use('/livecheck', livecheck.router());

  app.use('/v1/books', books.router());

  app.use('/conversation/api', conversation.router()); // routing to the conversation functions

  app.get('*', renderRouteMiddleware);

  return app;
}
