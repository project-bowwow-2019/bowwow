module.exports={
  getRegularHoursOneDay,
  toJsonHours,
  dayHoursToString,
  integerToDay,
  checkHoliday
}

//function to get the open and close hours of a particular day in regular hour handling. The input is integer 0-6 per javascript Date().getDay() method
function getRegularHoursOneDay(day, hours){
  if(day==0){
    return(hours.Sunday)
  } else if (day==1) {
    return(hours.Monday)
  } else if (day==2) {
    return(hours.Tuesday)
  } else if (day==3) {
    return(hours.Wednesday)
  } else if (day==4) {
    return(hours.Thursday)
  } else if (day==5) {
    return(hours.Friday)
  } else if (day==6) {
    return(hours.Saturday)
  } else {
    return false
  }
}

//helper function to turn the queried rows from database to a json format and a text format
function toJsonHours(hours){
  var hoursJson={}
  var hoursText=""
  var lineText=''

  for(let i=0;i<hours.rows.length;i++){
    if(hours.rows[i].day==0){
      hoursJson.Sunday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      lineText = dayHoursToString('Sunday',hours.rows[i])
      hoursText=hoursText + lineText;
    } else if (hours.rows[i].day==1) {
      hoursJson.Monday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      lineText = dayHoursToString('Monday',hours.rows[i])
      hoursText=hoursText + lineText;
    } else if (hours.rows[i].day==2) {
      hoursJson.Tuesday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      lineText = dayHoursToString('Tuesday',hours.rows[i])
      hoursText=hoursText + lineText;
    } else if (hours.rows[i].day==3) {
      hoursJson.Wednesday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      lineText = dayHoursToString('Wednesday',hours.rows[i])
      hoursText=hoursText + lineText;
    } else if (hours.rows[i].day==4) {
      hoursJson.Thursday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      lineText = dayHoursToString('Thursday',hours.rows[i])
      hoursText=hoursText + lineText;
    } else if (hours.rows[i].day==5) {
      hoursJson.Friday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      lineText = dayHoursToString('Friday',hours.rows[i])
      hoursText=hoursText + lineText;
    } else if (hours.rows[i].day==6) {
      hoursJson.Saturday={opens:hours.rows[i].opens, closes:hours.rows[i].closes, closed:hours.rows[i].closed}
      lineText = dayHoursToString('Saturday',hours.rows[i])
      hoursText=hoursText + lineText;
    }
  }
  return {hoursJson:hoursJson, hoursText:hoursText}
}

//helper function to turn 1 day of open and close times to text. turns "closed" day to "[day]: closed"
function dayHoursToString(day, hours){
  var hoursText=''
  var openHours=''
  if(hours.closed){
    hoursText = day + ': closed \n '
  } else {
    for(let i=0;i<hours.opens.length;i++){
      openHours = openHours + hours.opens[i] + ' - ' + hours.closes[i] + ', '
    }
    hoursText = day +': ' + openHours + ' \n '
  }
  return hoursText;
}

//helper function to turn an interger into string of week day integer: 0-6, sunday - staurday
function integerToDay(day){
  if(day==0){
    return('Sunday')
  } else if (day==1) {
    return('Monday')
  } else if (day==2) {
    return('Tuesday')
  } else if (day==3) {
    return('Wednesday')
  } else if (day==4) {
    return('Thursday')
  } else if (day==5) {
    return('Friday')
  } else if (day==6) {
    return('Saturday')
  } else {
    return('error in integerToDay function input: '+ day)
  }
}

//herlper function to see if a date is a US holiday
function checkHoliday (dt_date) {  // check for market holidays
// dt_date = new Date("2017-04-14T12:01:00Z"); // for testing purposes
	// check simple dates (month/date - no leading zeroes)
	var n_date = dt_date.getDate();
	var n_month = dt_date.getMonth() + 1;
	var s_date1 = n_month + '/' + n_date;
	var s_year = dt_date.getFullYear();
	var s_day = dt_date.getDay(); // day of the week 0-6
	switch(s_date1){
		case '1/1':
		return "New Year";
		case '7/4':
		return "Independence Day";
		case '12/25':
		return "Christmas";
		case GoodFriday(s_year):
		return "Good Friday";
		}
	// special cases - friday before or monday after weekend holiday
	if (s_day == 5){  // Friday before
		switch(s_date1){
			case '12/31':
			return "New Year";
			case '7/3':
			return "Independence Day";
			case '12/24':
			return "Christmas";
			}
		}
	if (s_day == 1){  // Monday after
		switch(s_date1){
			case '1/2':
			return "New Year";
			case '7/5':
			return "Independence Day";
			case '12/26':
			return "Christmas";
			}
		}
	// weekday from beginning of the month (month/num/day)
	var n_wday = dt_date.getDay();
	var n_wnum = Math.floor((n_date - 1) / 7) + 1;
	var s_date2 = n_month + '/' + n_wnum + '/' + n_wday;
	switch(s_date2){
		case '1/3/1':
		return "Martin Luther King Birthday";
		case '2/3/1':
		return "President's Day";
		case '9/1/1':
		return "Labor Day";
		case '11/4/4':
		return "Thanksgiving";
		}
	// weekday number from end of the month (month/num/day)
	var dt_temp = new Date (dt_date);
	dt_temp.setDate(1);
	dt_temp.setMonth(dt_temp.getMonth() + 1);
	dt_temp.setDate(dt_temp.getDate() - 1);
	n_wnum = Math.floor((dt_temp.getDate() - n_date - 1) / 7) + 1;
	var s_date3 = n_month + '/' + n_wnum + '/' + n_wday;
	if (   s_date3 == '5/1/1'  // Memorial Day, last Monday in May
	) return 'Memorial Day';
	// misc complex dates
//	if (s_date1 == '1/20' && (((dt_date.getFullYear() - 1937) % 4) == 0)
	// Inauguration Day, January 20th every four years, starting in 1937.
//	) return 'Inauguration Day';
//	if (n_month == 11 && n_date >= 2 && n_date < 9 && n_wday == 2
	// Election Day, Tuesday on or after November 2.
//	) return 'Election Day';
	return false;
}

//calculates the date for goodfriday
function GoodFriday(Y) {  // calculates Easter Sunday and subtracts 2 days
    var C = Math.floor(Y/100);
    var N = Y - 19*Math.floor(Y/19);
    var K = Math.floor((C - 17)/25);
    var I = C - Math.floor(C/4) - Math.floor((C - K)/3) + 19*N + 15;
    I = I - 30*Math.floor((I/30));
    I = I - Math.floor(I/28)*(1 - Math.floor(I/28)*Math.floor(29/(I + 1))*Math.floor((21 - N)/11));
    var J = Y + Math.floor(Y/4) + I + 2 - C + Math.floor(C/4);
    J = J - 7*Math.floor(J/7);
    var L = I - J;
    var M = 3 + Math.floor((L + 40)/44);
    var D = L + 28 - 31*Math.floor(M/4);
    //
    D = D-2;  // subtract 2 days for Good Friday
    if (D <= 0){
    	D = D + 31;	// correct day if we went back to March
    	M = 3;			// correct month
    	}
    return parseInt(M, 10) + '/' + parseInt(D, 10);  // return without any leading zeros
}
