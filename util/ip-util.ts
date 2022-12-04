import address from "address";

import { networkInterfaces } from "os";
import { Netmask } from "netmask";

const serverHost = process.env.SERVER_IPv4;
const serverNetmask = process.env.SERVER_IPv4_NETMASK;
const cameraHost = process.env.CAMERA_IP;
const cameraNetmask = process.env.CAMERA_NETMASK;

let cachedWlanIP: string | void = undefined;
let cachedLocalIP: string | void = undefined;

export function getLocalIP(): string | void {
  if (cachedLocalIP) {
    // make sure that the result IP is consistent, even if the network interface changes.
    // The process need to be restarted if such a change happens, and should not stay in
    // a state where the IP is not consistent.
    return cachedLocalIP;
  }

  const localInterface = process.env["LOCAL_INTERFACE"];
  const localInterfacePrefix = process.env["LOCAL_INTERFACE_PREFIX"];
  const block = new Netmask(`${cameraHost}/${cameraNetmask}`);

  console.log("pre-configured local interface name is", localInterface);

  cachedLocalIP = getIPv4(localInterface, localInterfacePrefix, block);
  return cachedLocalIP;
}

export function getWlanIP(): string | void {
  if (cachedWlanIP) {
    // make sure that the result IP is consistent, even if the network interface changes.
    // The process need to be restarted if such a change happens, and should not stay in
    // a state where the IP is not consistent.
    return cachedWlanIP;
  }

  const wlanInterface = process.env["WLAN_INTERFACE"];
  const wlanInterfacePrefix = process.env["WLAN_INTERFACE_PREFIX"];
  const block = new Netmask(`${serverHost}/${serverNetmask}`);

  console.log("pre-configured wlan interface name is", wlanInterface);

  cachedWlanIP = getIPv4(wlanInterface, wlanInterfacePrefix, block);
  return cachedWlanIP;
}

function getIPv4(ifName: string | undefined, ifPrefix: string | undefined, block: Netmask): string | void {
  if (ifName) {
    const ip: string | void = address.ip(ifName);
    if (ip && block.contains(ip)) {
      return ip;
    }
    console.error("wrong subnet:", ip, "not in", `${serverHost}/${serverNetmask}`);
  }
  const interfaces = networkInterfaces();
  if (ifPrefix) {
    for (const [name, info] of Object.entries(interfaces)) {
      if (!info) continue;
      if (name.startsWith(ifPrefix)) {
        for (const item of info) {
          if (item.family === "IPv4") {
            const ip = item.address;
            if (block.contains(ip)) {
              return ip;
            }
          }
        }
      }
    }
  }
  for (const [_, info] of Object.entries(interfaces)) {
    if (!info) continue;
    for (const item of info) {
      if (item.family === "IPv4") {
        const ip = item.address;
        if (block.contains(ip)) {
          return ip;
        }
      }
    }
  }
  return;
}
