var log4js = require('log4js');

module.exports = (() => {
  log4js.configure({
    appenders: {
      file: {
        type: 'file',
        filename: './logs/bowow.log',
        maxLogSize: 200000000 // 200 MBs
      }
    },
    categories: {
      default: {
        appenders: ['file'],
        level: 'info'
      }
    }
  });

  const logger = log4js.getLogger();

  return logger;
})();
