const fs = require('fs');
const distance = require('gps-distance');
const axios = require('axios');
const cron = require('node-cron');

const pushover = {
  user: 'userid',
  token: 'apitoken'
}

const zip = '55113'

const maxDistance = 50; // this is in miles, mirrors 50 mi in the webpage options list

// get timestamp here https://www.unixtimestamp.com/
const eligibilityTimestamp = 1617098400 // set to March 30th at 5am

const locationIdBlacklist = [
  783522
]

let myGPS = [] // this gets set later

function getGPS() {
  return new Promise(function (resolve, reject) {
    let rawdata = fs.readFileSync('postalcodes.json');
    let zipcodes = JSON.parse(rawdata);
    // console.log(zipcodes[zip]);
    myGPS = zipcodes[zip].reverse();
    console.log(myGPS)
    if (myGPS.length == 2) {
      resolve()
    } else {
      reject('GPS coordinates for your zipcode are not found.')
    }

  });
}

function processData(json) {
  return new Promise(function (resolve, reject) {
    const obj = json.features;

    let _availableLocations = []
    let _totalAppointments = 0

    obj.forEach(element => {
      if (element.properties.appointments_available == true && (distance(element.geometry.coordinates[1], element.geometry.coordinates[0], myGPS[0], myGPS[1]) < (maxDistance * 1.60934)) && !locationIdBlacklist.includes(element.properties.id)) {
        _totalAppointments += element.properties.appointments.length
        _availableLocations.push(element)
      }
    });

    if (_availableLocations.length > 0) {
      resolve({
        'availableLocations': _availableLocations,
        'totalAppointments': _totalAppointments
      });
    } else {
      reject(`No appointments available within ${maxDistance} miles`);
    }
  });
}


function sendNotification(obj) {
  let msg = `There are ${obj.availableLocations.length} locations with a total of ${obj.totalAppointments} open appointments. Go here for more deets. https://www.vaccinespotter.org/MN/?zip=${zip}&radius=${maxDistance}`;

  if (pushover.user != 'userid') {
    // Send a POST request
    axios({
      method: 'post',
      url: 'https://api.pushover.net/1/messages.json',
      data: {
        token: pushover.token,
        user: pushover.user,
        message: msg,
        sound: 'tugboat',
        title: 'Vaccination appointments available',
        priority: 1
      }
    });
  } else {
    console.log('This is where you would get notified with: ')
    console.log(msg);
  }


}

function getAppointments() {
  return new Promise(function (resolve, reject) {
    axios({
      method: 'get',
      url: 'https://www.vaccinespotter.org/api/v0/states/MN.json'
    }).then(function (response) {
      resolve(response.data);
    }).catch(function (error) {
      reject(error)
    });
  })
}

function areEligible() {
  return new Promise(function (resolve, reject) {
    if ((Date.now() / 1000) > eligibilityTimestamp) {
      console.log('ARE ELIGIBLE. Running...')
      resolve();
    } else {
      reject('You are not eligible yet')
    }
  })
}
// run one right away, then cron it
getGPS().then(areEligible).then(getAppointments).then(processData).then(sendNotification).catch(console.error);

cron.schedule('*/5 * * * *', () => {
  areEligible().then(getAppointments).then(processData).then(sendNotification).catch(console.error);
});

console.log('file loaded at: ' + new Date().toString())
