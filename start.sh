#!/bin/bash
echo 'plogging-server start'
git pull origin master
npm install
pm2 stop all
pm2 delete all
pm start start.config.js --env development
