const log = require('./log')
const fs = require('fs');
const bodyParser = require('body-parser');
const express = require('express');
const next = require('next')
const path = require('path');
const handler = require('./controllers/handlerController')
const livecheck = require('./routes/livecheck')
const chatbot = require('./routes/chatbot');

const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev })
const handle = nextApp.getRequestHandler()

module.exports = createServer();

function createServer(){

  let port = 5000;

  nextApp.prepare()
  .then(()=>{
    const errorFile = fs.createWriteStream('./logs/errors.log', { flags: 'a' });
    process.__defineGetter__('stderr', () => {
      return errorFile;
    });

    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use('*', handler.requestLogging);

    app.use('/livecheck', livecheck.router());

    app.use('/chatbot/api', chatbot.router());

    app.get('*', (req,res) => {
      return handle(req,res)
    })

    app.listen(process.env.PORT || port, (err) =>{
      if (err) throw err
      console.log(`Bowwow is listening on port ${port}`);
      log.info(`Bowwow listening on port ${port}}`);
    })
  })
  .catch((ex) => {
    console.error(ex.stack)
    process.exit(1)
  })


  process.on('SIGBREAK', () => shutdown());
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());

}

function shutdown () {
  log.info('Stopping...');
  process.exit();
}
