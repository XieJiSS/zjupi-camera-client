#!/bin/bash

cd "$(dirname "$0")"

pm2 stop peer
pm2 start peer.js
pm2 save
