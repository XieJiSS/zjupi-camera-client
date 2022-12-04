const serverHost = process.env.SERVER_IPv4;
const serverPort = process.env.SERVER_PORT;
const serverNetmask = process.env.SERVER_IPv4_NETMASK;
const origin = `http://${serverHost}:${serverPort}`;

import { networkInterfaces } from "os";
import axios from "axios";
import { ip as interfaceIP } from "address";
import { Netmask } from "netmask";

function guessWlanIP(): string | void {
  const wlanInterface = process.env["WLAN_INTERFACE"];
  console.log("pre-configured wlan interface name is", wlanInterface);
  const block = new Netmask(`${serverHost}/${serverNetmask}`);
  if (wlanInterface) {
    const ip: string | void = interfaceIP(wlanInterface);
    if (ip && block.contains(ip)) {
      return ip;
    }
    console.error("wrong subnet:", ip, "not in", `${serverHost}/${serverNetmask}`);
  }
  const interfaces = networkInterfaces();
  const wlanInterfacePrefix = process.env["WLAN_INTERFACE_PREFIX"];
  if (wlanInterfacePrefix) {
    for (const [name, info] of Object.entries(interfaces)) {
      if (!info) continue;
      if (name.startsWith(wlanInterfacePrefix)) {
        for (const item of info) {
          const ip = item.address;
          if (block.contains(ip)) {
            console.log("guessed wlan IP:", ip, name);
            return ip;
          }
        }
      }
    }
  }
  for (const [name, info] of Object.entries(interfaces)) {
    if (!info) continue;
    for (const item of info) {
      const ip = item.address;
      if (block.contains(ip)) {
        console.log("guessed wlan IP with low confidence:", ip, name);
        return ip;
      }
    }
  }
  console.error("failed to guess wlan IP");
  return;
}

export default axios.create({
  baseURL: origin,
  headers: {
    "User-Agent": "SmartCamera/" + require("../package.json").version,
    "X-Real-IP": guessWlanIP() || "failed to get",
  },
  timeout: 5000,
});
