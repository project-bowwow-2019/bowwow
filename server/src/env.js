'use strict';

module.exports = (() => {
  return {
    databaseURI: getDatabaseURI()
  };
})();


function getDatabaseURI () {
  return process.env.BOWWOW_DATABASE_URI || 'dumb-value-for-now';
}
