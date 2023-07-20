// -- HANDLE INITIAL SETUP -- //
require('./helpers/server')
require("dotenv").config();

let currentTime = new Date();

if(currentTime.getSeconds() % 60 === 0) {
  console.log('currentTime')
}