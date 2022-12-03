// @ts-check

import { readFileSync } from "fs";
import axios from "./init-axios";

const host = process.env.SERVER_IPv4;
const port = process.env.SERVER_PORT;
const origin = `http://${host}:${port}/`;

const CAMERA_ID = process.env.CAMERA_ID;

export async function reportCameraError(summary: string, detail: string) {
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

export function getReportEnv() {
  const env = readFileSync(__dirname + "/.env").toString("utf-8");
  const lines = env.trimEnd().split("\n");
  return lines.filter((line) => !line.includes("PASSWORD")).join("\n");
}
