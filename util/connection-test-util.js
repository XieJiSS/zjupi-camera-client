// @ts-check
require("dotenv").config();
const axios = require("./init-axios");
const { Netmask } = require("netmask");
const address = require("address");

async function testServerConnection() {
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
    console.error(new Date(), error);
    return false;
  }
}

async function testCameraConnection() {
  const cameraIP = process.env.CAMERA_IP;
  const netmask = process.env.CAMERA_NETMASK;
  const block = new Netmask(`${cameraIP}/${netmask}`);

  const localIP = address.ip("en7"); // @TODO: dev only
  if (!block.contains(localIP)) {
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

module.exports = {
  testServerConnection,
  testCameraConnection,
};