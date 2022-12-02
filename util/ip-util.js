// @ts-check

const address = require("address");

function getLocalIP() {
  return address.ip(); // dev only
}

module.exports = {
  getLocalIP,
};
