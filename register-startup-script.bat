@echo off

npm i -g yarn --registry=https://registry.npm.taobao.org
npm i -g pm2 --registry=https://registry.npm.taobao.org
npm i -g pm2-windows-startup --registry=https://registry.npm.taobao.org
yarn config set registry https://registry.npm.taobao.org
yarn install
yarn run build

powershell -c "pm2-startup install"
pause
