import { config } from "dotenv";
config();
import address from "address";

export function getLocalIP() {
  return address.ip(process.env["WLAN_INTERFACE"]); // dev only
}
