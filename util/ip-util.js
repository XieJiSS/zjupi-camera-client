// @ts-check
require("dotenv").config();
const address = require("address");

function getLocalIP() {
  return address.ip(process.env["WLAN_INTERFACE"]); // dev only
}

module.exports = {
  getLocalIP,
};
