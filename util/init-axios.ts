const serverHost = process.env.SERVER_IPv4;
const serverPort = process.env.SERVER_PORT;
const origin = `http://${serverHost}:${serverPort}`;

import axios from "axios";

export default axios.create({
  baseURL: origin,
  headers: {
    "User-Agent": "SmartCamera/" + require("../package.json").version,
    "X-Real-IP": require("address").ip(process.env.WLAN_INTERFACE) || "failed to get",
  },
  timeout: 5000,
});
