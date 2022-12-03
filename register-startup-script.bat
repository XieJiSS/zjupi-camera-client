@echo off

npm i -g yarn --registry=https://registry.npm.taobao.org
yarn config set registry https://registry.npm.taobao.org
yarn install
yarn run build

powershell -c "pm2 startup"
powershell
pause
