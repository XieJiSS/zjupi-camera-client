// @ts-check
const serverHost = process.env.SERVER_IPv4;
const serverPort = process.env.SERVER_PORT;
const origin = `http://${serverHost}:${serverPort}`;

const axios = require("axios").default.create({
  baseURL: origin,
  headers: {
    "User-Agent": "SmartCamera/" + require("../package.json").version,
    "X-Real-IP": require("address").ip("en7") || "failed to get", // debug only
  },
  timeout: 5000,
});

module.exports = axios;
