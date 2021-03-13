#!/bin/bash
echo 'plogging-server start'

git pull origin develop

docker stop plogging-app || true
docker rm plogging-app || true
docker rmi plogging-app-img || true

docker build -t plogging-app-img .
docker run -it -d -p 443:443 --name plogging-app -e APP_ENCRYPTION_PASSWORD=plogging-pw -v /data/ploggingImgs:/mnt/Plogging_server/images plogging-app-img
