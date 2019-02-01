const express = require('express');
const next = require('next');
const http = require('http');
const app = require('./server/src/app');
const log = require('./server/log')

const dev = process.env.NODE_ENV !== 'production'
const server = next({ dev })
const handle = server.getRequestHandler()

server.prepare()
.then(() => {
  const errorFile = fs.createWriteStream('/server/logs/errors.log', { flags: 'a' });
  process.__defineGetter__('stderr', () => {
    return errorFile;
  });

  let port = 5000;
  http.createServer(app).listen(process.env.PORT || port);
  process.on('SIGBREAK', () => shutdown());
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());

  console.log(`Omnibus is listening on port ${port}`);
  log.info(`Omnibus is listening on port ${port}}`);

})
.catch((ex) => {
  console.error(ex.stack)
  process.exit(1)
})
