// @ts-check

const { readFileSync } = require("fs");
const axios = require("./init-axios");

const host = process.env.SERVER_IPv4;
const port = process.env.SERVER_PORT;
const origin = `http://${host}:${port}/`;

const CAMERA_ID = process.env.CAMERA_ID;

/**
 * @param {string} summary
 * @param {string} detail
 */
async function reportCameraError(summary, detail) {
  const url = new URL("/api/camera/reportError", origin);
  try {
    await axios.post(url.href, {
      cameraId: CAMERA_ID,
      summary,
      detail,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(new Date(), "reportCameraError", error);
  }
}

function getReportEnv() {
  const env = readFileSync(__dirname + "/.env").toString("utf-8");
  const lines = env.trimEnd().split("\n");
  return lines.filter((line) => !line.includes("PASSWORD")).join("\n");
}

module.exports = {
  reportCameraError,
  getReportEnv,
};
