// @ts-check

require("dotenv").config();
const axios = require("./init-axios");
const { testCameraConnection } = require("./connection-test-util");
const { getHTTP09GETResponseText, getHTTP09POSTResponseText } = require("./http09");

const cameraIP = process.env.CAMERA_IP;
const username = process.env.CAMERA_USERNAME;
const password = process.env.CAMERA_PASSWORD;

const cameraSession = {
  sessionCookie: "",
  hasLogin: false,
};

const controlConfig = {
  horizontalRotateSpeed: 50,
  verticalRotateSpeed: 30,
};

async function getSessionCookie() {
  if (!testCameraConnection()) {
    return "";
  }
  const url = new URL(`http://${cameraIP}/pages/login.asp`);
  try {
    const response = await axios.get(url.href, {
      timeout: 2000,
      proxy: false,
    });
    const cookies = response.headers["set-cookie"] ?? [];
    const sessionCookie = cookies.find((cookie) => cookie.startsWith("-goahead-session-"));
    if (!sessionCookie) {
      console.error(new Date(), "failed to get session cookie");
      return "";
    }
    const sessionCookieValueOnly = sessionCookie.replace(/^-goahead-session-=/, "");
    console.log(new Date(), "successfully got session cookie:", sessionCookieValueOnly);
    return sessionCookieValueOnly;
  } catch (error) {
    console.error(new Date(), error);
    return "";
  }
}

/**
 * is this necessary? seems like apis always work, even without login
 */
async function loginUser() {
  const url = new URL(`http://${cameraIP}/login/login?username=${username}&password=${password}&_=${Date.now()}`);
  try {
    const responseText = await getHTTP09GETResponseText(url, {
      "-goahead-session-": "::webs.session::c3e2cd38edc7ed4b0cda8f22ccb41390",
    });
    const json = JSON.parse(responseText);
    if (!json?.success) {
      console.error(new Date(), "failed to login as", username);
      return false;
    }
    console.log(new Date(), "successfully logged in as", username);
    return true;
  } catch (error) {
    console.error(new Date(), error);
    return false;
  }
}

const INIT_FAILURE_CODES = {
  1: "camera connection failed",
  2: "failed to get session cookie",
  3: "failed to login as user",
  0: "success",
};

async function initCameraUser() {
  if (!testCameraConnection()) {
    return 1;
  }
  const sessionCookie = await getSessionCookie();
  if (!sessionCookie) {
    return 2;
  }
  cameraSession.sessionCookie = sessionCookie;
  const loginSuccess = await loginUser();
  if (!loginSuccess) {
    return 3;
  }
  cameraSession.hasLogin = true;
  return 0;
}

/**
 * @typedef CameraControlConfig
 * @prop {number} horizontalRotateSpeed
 * @prop {number} verticalRotateSpeed
 */

/**
 * @param {Partial<CameraControlConfig>} _
 */
function setCameraSpeed({ horizontalRotateSpeed: hs, verticalRotateSpeed: vs }) {
  controlConfig.horizontalRotateSpeed = hs ?? controlConfig.horizontalRotateSpeed;
  controlConfig.verticalRotateSpeed = vs ?? controlConfig.verticalRotateSpeed;
}

/**
 *
 * @param {string} directive
 * @param {"start" | "stop"} status
 */
async function sendCameraOperation(directive, status) {
  const verticalDirectives = ["up", "down"];
  const opType = verticalDirectives.includes(directive) ? "vertical" : "horizontal";
  const speed = opType === "vertical" ? controlConfig.verticalRotateSpeed : controlConfig.horizontalRotateSpeed;
  const op = `${directive}_${status}`;
  const command = {
    SysCtrl: {
      PtzCtrl: { nChanel: 0, szPtzCmd: op, byValue: speed },
    },
  };
  const commandStr = JSON.stringify(command);
  const url = new URL(`http://${cameraIP}/ajaxcom`);
  try {
    const responseText = await getHTTP09POSTResponseText(
      url,
      { "-goahead-session-": cameraSession.sessionCookie },
      new URLSearchParams({ szCmd: commandStr })
    );
    const json = JSON.parse(responseText);
    if (!json || json.szError || json.errno) {
      console.error(new Date(), "failed to invoke camera operation", op, "and got resp", json);
      return false;
    }
    console.log(new Date(), "successfully invoked camera operation", op, "and got resp", json);
    return true;
  } catch (error) {
    console.error(new Date(), "failed to invoke camera operation", op, "because of", error);
    return false;
  }
}

async function initCameraController() {
  console.log(new Date(), "initializing camera...");
  const initResult = await initCameraUser();
  if (initResult !== 0) {
    console.error(new Date(), "failed to initialize camera:", INIT_FAILURE_CODES[initResult]);
    return false;
  }
  console.log(new Date(), "successfully initialized camera");
  return true;
}

module.exports = {
  initCameraController,
  sendCameraOperation,
  setCameraSpeed,
};
