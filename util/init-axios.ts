const serverHost = process.env.SERVER_IPv4;
const serverPort = process.env.SERVER_PORT;
const origin = `http://${serverHost}:${serverPort}`;

import axios from "axios";
import { getWlanIP } from "./ip-util";

export default axios.create({
  baseURL: origin,
  headers: {
    "User-Agent": "SmartCamera/" + require("../package.json").version,
    "X-Real-IP": getWlanIP() || "failed to get",
  },
  timeout: 5000,
});
