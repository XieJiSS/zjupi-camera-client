@echo off

cd /d %~dp0

powershell -Command "pm2 stop peer"
powershell -Command "pm2 start peer.js"
powershell -Command "pm2 save"
