const serverHost = process.env.SERVER_IPv4;
const serverPort = process.env.SERVER_PORT;
const origin = `http://${serverHost}:${serverPort}`;

import axios from "axios";
import { getLocalIP } from "./ip-util";

export default axios.create({
  baseURL: origin,
  headers: {
    "User-Agent": "SmartCamera/" + require("../package.json").version,
    "X-Real-IP": getLocalIP() || "failed to get",
  },
  timeout: 5000,
});
