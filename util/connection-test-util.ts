import { config } from "dotenv";
config();
import axios from "./init-axios";
import { Netmask } from "netmask";
import { getLocalIP } from "./ip-util";

export async function testServerConnection() {
  const host = process.env.SERVER_IPv4;
  const port = process.env.SERVER_PORT;
  const url = new URL(`http://${host}:${port}/api/camera/ping`);

  try {
    await axios.get(url.href, {
      timeout: 2000,
    });
    console.log(new Date(), "successfully connected to server");
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(new Date(), error.message);
    } else {
      console.error(new Date(), String(error));
    }
    return false;
  }
}

export async function testCameraConnection() {
  const cameraIP = process.env.CAMERA_IP;
  const netmask = process.env.CAMERA_NETMASK;
  const block = new Netmask(`${cameraIP}/${netmask}`);

  const localIP = getLocalIP();
  if (!localIP || !block.contains(localIP)) {
    console.error(new Date(), "local IP is not in the same network as the camera");
    return false;
  }

  try {
    await axios.get("http://" + cameraIP, {
      timeout: 2000,
      proxy: false,
    });
    return true;
  } catch (error) {
    console.error(new Date(), "testCameraConnection", error);
    return false;
  }
}
