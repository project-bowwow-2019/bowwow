const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const path = require('path');

const appRoot = path.join(__dirname,'../../../')

const scopes = ['https://www.googleapis.com/auth/calendar']

const credentials = path.join(appRoot,'credentials/calendar-integration-52ce633a85b3.json')

const tokenPath = path.join(appRoot, 'credentials/token.json')

const projectId = "quickstart-1551811107205";

//const {client_secret, client_id, redirect_uris} = credentials.installed;
//const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

module.exports = {
  listCurrentAppointments,
  listAppointmentAt,
  insertAppointment,
};

// configure a JWT auth client
const jwtClient = new google.auth.JWT(
       credentials.client_email,
       credentials,
       null,
       ['https://www.googleapis.com/auth/calendar']);
//authenticate request
jwtClient.authorize(function (err, tokens) {
 if (err) {
   console.log(err);
   return;
 } else {
   console.log("Successfully connected!");
 }
});

function listCurrentAppointments(hours){
  let calendar = google.calendar('v3');
  calendar.events.list({
    auth: jwtClient,
    calendarId: 'aq3f1u8tj72ereh2b3ga3qsqao@group.calendar.google.com',
    timeMin: (new Date()).toISOString,
    timeMax: (new Date() + hours*60*60*1000).toISOString
  }, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return('The API returned an error: ' + err);
      }
      var events = response.data.items;
      return(events)
    }
  });
}

function listAppointmentAt(dateTime, interval){
  let calendar = google.calendar('v3');
  calendar.events.list({
    auth: jwtClient,
    calendarId:'aq3f1u8tj72ereh2b3ga3qsqao@group.calendar.google.com',
    timeMin:(new Date(dateTime)).toISOString,
    timeMax:(new Date(dateTime)+interval*60*1000).toISOString,
  }, function(err, response){
    if (err){
      console.log('The API returned an error: ' + err);
      return('The API returned an error: ' + err);
    }
    var events = response.data.items;
    return(events)
  })
}

function insertAppointmentAt(event){
  let calendar = google.calendar('v3');
  calendar.events.insert({
    auth: jwtClient,
    calendarId:'aq3f1u8tj72ereh2b3ga3qsqao@group.calendar.google.com',
    resource: event,
  }, function(err, response){
    if (err){
      console.log('The API returned an error: ' + err);
      return('The API returned an error: ' + err);
    }
    console.log('Event created: %j', event)
  })
}
