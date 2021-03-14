#!/bin/bash
echo 'plogging-server start'

branch=$1

echo deploy ${branch}

git pull origin ${branch}

docker stop plogging-app || true
docker rm plogging-app || true
docker rmi plogging-app-img || true

if [ "${branch}" = "develop" ]; then
	docker build -t plogging-app-img ./dev.Dockerfile
	docker run -it -d -p 8000:8000 --name plogging-app -e APP_ENCRYPTION_PASSWORD=plogging-pw -v /data/ploggingImgs:/mnt/Plogging_server/images plogging-app-img
elif [ "${branch}" = "master" ]; then
	docker build -t plogging-app-img ./prod.Dockerfile
	docker run -it -d -p 8000:8000 --name plogging-app -e APP_ENCRYPTION_PASSWORD=plogging-pw -v /data_1/ploggingImgs:/mnt/Plogging_server/images plogging-app-img
else 
	echo "please check branchName"
fi

