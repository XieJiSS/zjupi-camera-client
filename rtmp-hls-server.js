// @ts-check
require("dotenv").config();

const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const HLSServer = require("hls-server");
const http = require("http");

const server = http.createServer();
const hls = new HLSServer(server, {
  path: "/streams", // Base URI to output HLS streams
  dir: "m3u8", // Directory that input files are stored
  debugPlayer: true,
});

const cameraIP = process.env.CAMERA_IP;
const rtmpPath = "live/av0";

const hlsPort = Number(process.env.HLS_STREAM_PORT);
if (hlsPort === 0 || Number.isNaN(hlsPort)) {
  console.error(new Date(), "invalid HLS_STREAM_PORT");
  process.exit(1);
}

require("http-attach")(server, function (req, res, next) {
  if (req.url === "/index.html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.statusCode = 200;
    fs.createReadStream(__dirname + "/m3u8/index.html").pipe(res);
  } else {
    next();
  }
});

/**
 * @param {(...args: any) => void} endCallback
 */
function startRTMPServer(endCallback) {
  cleanUpMediaFiles();
  ffmpeg(`rtmp://${cameraIP}/${rtmpPath}`, { timeout: 60000 })
    .addOptions([
      "-c:v libx264",
      "-c:a aac",
      "-ac 1",
      "-strict -2",
      "-crf 23",
      "-profile:v baseline",
      "-maxrate 8000k",
      "-bufsize 1835k",
      "-pix_fmt yuv420p",
      "-hls_time 4",
      "-hls_list_size 2",
      "-hls_flags 2",
    ])
    .output("m3u8/av0.m3u8")
    .on("start", () => {
      server.listen(hlsPort);
      console.log(new Date(), "HLS server listening on port", hlsPort);
    })
    .on("end", async (...args) => {
      console.error(new Date(), "streaming ended");
      endCallback(...args);
    })
    .run();
}

/**
 * WARNING: this will end all ffmpeg processes on this machine
 */
function endRTMPServer() {
  server.close();
  if (require("os").platform() === "win32") {
    require("child_process").execSync("taskkill /f /im ffmpeg.exe");
  } else {
    require("child_process").execSync("killall ffmpeg");
  }
  cleanUpMediaFiles();
}

function cleanUpMediaFiles() {
  const mediaFiles = fs.readdirSync(__dirname + "/m3u8");
  for (const file of mediaFiles) {
    if (file.endsWith(".m3u8") || file.endsWith(".ts")) {
      fs.unlinkSync(`m3u8/${file}`);
    }
  }
}

module.exports = { startRTMPServer, endRTMPServer };
