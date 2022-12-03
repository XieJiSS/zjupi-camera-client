import { config } from "dotenv";
config();
import express from "express";
import fs from "fs";
import path from "path";

import { testServerConnection, testCameraConnection } from "./util/connection-test-util";
import { sendCameraOperation, initCameraController, setCameraSpeed } from "./util/camera-controller";
import { reportCameraError, getReportEnv } from "./util/error-report";
import { getLocalIP } from "./util/ip-util";
import { startRTMPServer } from "./rtmp-hls-server";

import axios from "./util/init-axios";

const app = express();
const port = 5004;

const CAMERA_ID = process.env.CAMERA_ID;
if (!CAMERA_ID) {
  console.error(new Date(), "CAMERA_ID is not set");
  process.exit(1);
}

console.log("This is camera", CAMERA_ID, "on wlan interface", process.env["WLAN_INTERFACE"]);

let heartbeatFailedCount = 0;

let stopCurrOpTimerInfo: { timer: NodeJS.Timeout | null; lastDirective: string | null } = {
  timer: null,
  lastDirective: null,
};

app.use(express.json());

app.use((req, res, next) => {
  const ip = req.socket.remoteAddress;
  if (!ip || ![process.env.SERVER_IPv4, process.env.SERVER_IPv6].includes(ip)) {
    res.json({ success: false, message: "unauthorized IP" });
    console.error(new Date(), "unauthorized remote IP:", ip);
    return;
  }
  next();
});

app.get("/api/camera-client/ping", (req, res) => {
  res.json({ success: true, message: "pong" });
});

app.post("/api/camera-client/operation", async (req, res) => {
  const { directive, status, speed } = req.body; // left start 30
  if (
    !directive ||
    !status ||
    !speed ||
    typeof directive !== "string" ||
    typeof status !== "string" ||
    typeof speed !== "number"
  ) {
    res.json({ success: false, message: "invalid request body" });
    return;
  }
  if (!(0 <= speed && speed <= 50)) {
    res.json({ success: false, message: "invalid speed" });
    return;
  }
  const speedConfig: Partial<import("./util/camera-controller").CameraControlConfig> = {};
  if (directive === "left" || directive === "right") {
    speedConfig.horizontalRotateSpeed = speed;
  } else if (directive === "up" || directive === "down") {
    speedConfig.verticalRotateSpeed = speed;
  } else {
    res.json({ success: false, message: "invalid directive" });
    return;
  }
  if (status !== "start" && status !== "stop") {
    res.json({ success: false, message: "invalid status" });
    return;
  }

  if (stopCurrOpTimerInfo.timer) {
    // regardless of what this operation is, clear the old stop-curr-op timer
    // this must be invoked first
    const lastDirective = stopCurrOpTimerInfo.lastDirective;

    clearTimeout(stopCurrOpTimerInfo.timer);
    stopCurrOpTimerInfo.timer = null;
    stopCurrOpTimerInfo.lastDirective = null;

    if (lastDirective && lastDirective !== directive) {
      // stop the still-running operation
      console.log(new Date(), "stopping the still-running operation:", lastDirective);
      await sendCameraOperation(lastDirective, "stop");
    }
  }

  if (status === "start") {
    stopCurrOpTimerInfo = {
      timer: setTimeout(async () => {
        console.log(new Date(), "automatically stopping the operation after 3s:", directive);
        // stop the current operation after 3 seconds, in case the client fails to stop it,
        // and didn't send other operations in advance.
        // since we're using await, it may happen that when sending "stop" (before clearing
        // stopCurrOpTimerInfo.timer), a new operation comes in, and another "stop" is sent,
        // but our camera can handle that, so it's fine. Not implementing lock for this now.
        await sendCameraOperation(directive, "stop");

        stopCurrOpTimerInfo.timer = null;
        stopCurrOpTimerInfo.lastDirective = null;
      }, 3000),
      lastDirective: directive,
    };
  } else {
    // set lastDirective to null if status is "stop", to avoid leaking states
    stopCurrOpTimerInfo.lastDirective = null;
    if (stopCurrOpTimerInfo.timer !== null) {
      console.error(new Date(), "never: stopCurrOpTimerInfo.timer should be null here");
    }
  }

  console.log(new Date(), "performing operation:", directive, status, speed);

  setCameraSpeed(speedConfig);
  const success = await sendCameraOperation(directive, status);

  res.json({ success });
});

app.listen(port, async () => {
  console.log(new Date(), `camera peer server listening at http://${getLocalIP()}:${port}`);

  const serverConnectionTestResult = await testServerConnection();
  if (!serverConnectionTestResult) {
    console.error(new Date(), "camera control server connection test failed");
    await exitWithSleep(2000, 1);
  }

  const cameraConnectionTestResult = await testCameraConnection();
  if (!cameraConnectionTestResult) {
    console.error(new Date(), "smart camera connection test failed");
    await reportCameraError(
      "camera connection test failed",
      `can't connect to the smart camera: env is ${getReportEnv()}`
    );
    await exitWithSleep(2000, 1);
  }

  const initCameraResult = initCameraController();
  if (!initCameraResult) {
    console.error(new Date(), "init camera controller failed");
    await reportCameraError("init camera controller failed", `can't init camera controller: env is ${getReportEnv()}`);
    await exitWithSleep(2000, 1);
  }

  setInterval(async () => {
    if (heartbeatFailedCount >= 3) {
      console.error(new Date(), "heartbeat failed 3 times, exiting");
      await exitWithSleep(2000, 1);
    }
    const heartbeatResult = (
      await axios.post("/api/camera/heartbeat", {
        cameraId: CAMERA_ID,
      })
    ).data;
    if (!heartbeatResult.success) {
      console.error(new Date(), "heartbeat failed:", heartbeatResult.message);
      heartbeatFailedCount++;
      return;
    } else {
      heartbeatFailedCount = 0;
    }
  }, 10 * 1000);

  const registerResp = (
    await axios.post("/api/camera/register", {
      cameraId: CAMERA_ID,
    })
  ).data;
  if (!registerResp.success) {
    console.error(new Date(), "register failed:", registerResp.message);
    await exitWithSleep(2000, 1);
  }

  startRTMPServer(async function onRTMPServerEnded(...args) {
    console.error(new Date(), "RTMP server ended unexpectedly");
    await reportCameraError(
      "RTMP server ended unexpectedly",
      `RTMP server ended unexpectedly: env is ${getReportEnv()}, args is ${args}`
    );
    await exitWithSleep(2000, 1);
  });
});

async function exitWithSleep(ms: number, code = 0) {
  await require("timers/promises").setTimeout(ms);
  process.exit(code);
}

async function clearMediaFiles() {
  const m3u8Dir = path.join(__dirname, "m3u8");
  const files = await fs.promises.readdir(m3u8Dir);
  for (const file of files) {
    if (file.endsWith(".ts") || file.endsWith(".m3u8")) {
      await fs.promises.unlink(path.join(m3u8Dir, file));
    }
  }
}

import exitHook from "async-exit-hook";
exitHook(async (callback) => {
  console.log(new Date(), "exiting");
  require("./rtmp-hls-server").endRTMPServer();
  await clearMediaFiles();
  callback();
});
