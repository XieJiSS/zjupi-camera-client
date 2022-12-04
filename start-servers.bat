@echo off

cd /d "%~dp0"
cd dist

powershell -Command "pm2 stop peer"
powershell -Command "pm2 start peer.js"
powershell -Command "pm2 save"
