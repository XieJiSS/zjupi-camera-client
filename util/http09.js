// @ts-check
const { Socket } = require("net");

/**
 * @param {URL} url
 * @param {{ [x: string]: string }} cookies
 */
function getHTTP09GETResponseText(url, cookies) {
  const host = url.host;
  const path = url.pathname;
  const params = url.searchParams;
  const finalPath = path + "?" + params.toString();
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  // construct raw HTTP 1.1 request
  const request = `GET ${finalPath} HTTP/1.1\r
Host: ${host}\r
Accept: application/json, */*\r
X-Requested-With: XMLHttpRequest\r
Cookie: ${cookieHeader}\r\n\r\n`;
  const socket = new Socket();
  return new Promise((resolve, reject) => {
    let response = Buffer.alloc(0);
    socket.on("data", (data) => {
      response = Buffer.concat([response, data]);
    });
    socket.once("error", (error) => {
      reject(error);
    });
    socket.once("close", () => {
      socket.removeAllListeners("data");
      resolve(response.toString("utf-8"));
    });
    socket.connect({ host, port: 80 }, () => {
      socket.write(request);
    });
  });
}

/**
 * @param {URL} url
 * @param {{ [x: string]: string }} cookies
 * @param {URLSearchParams} body
 */
function getHTTP09POSTResponseText(url, cookies, body) {
  const host = url.host;
  const path = url.pathname;
  const params = url.searchParams;
  const finalPath = path + "?" + params.toString();
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  // construct raw HTTP 1.1 request
  const request = `POST ${finalPath} HTTP/1.1\r
Host: ${host}\r
Accept: application/json, */*\r
X-Requested-With: XMLHttpRequest\r
Cookie: ${cookieHeader}\r
Content-Type: application/x-www-form-urlencoded\r
Content-Length: ${body.toString().length}\r\n\r\n${body}`;
  console.log(body.toString());
  const socket = new Socket();
  return new Promise((resolve, reject) => {
    let response = Buffer.alloc(0);
    socket.on("data", (data) => {
      response = Buffer.concat([response, data]);
    });
    socket.once("error", (error) => {
      reject(error);
    });
    socket.once("close", () => {
      socket.removeAllListeners("data");
      resolve(response.toString("utf-8"));
    });
    socket.connect({ host, port: 80 }, () => {
      socket.write(request);
    });
  });
}

module.exports = {
  getHTTP09GETResponseText,
  getHTTP09POSTResponseText,
};
