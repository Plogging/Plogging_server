#!/bin/bash
echo 'plogging-server start'

branch=$1
ip=$2

echo deploy ${branch}

git pull origin ${branch}

docker stop plogging-app || true
docker rm plogging-app || true
docker rmi plogging-app-img || true

if [ "${branch}" = "develop" ]; then
	echo "asus server !"
	docker build -t plogging-app-img ./Dockerfile/dev.Dockerfile
	docker run -it -d -p 8000:8000 --name plogging-app -e APP_ENCRYPTION_PASSWORD=plogging-pw -v /data/ploggingImgs:/mnt/Plogging_server/images plogging-app-img
elif [ "${branch}" = "master" ]; then
	docker build -t plogging-app-img ./Dockerfile/prod.Dockerfile
	if [ "${ip}" = "192.168.0.17" ]; then
        echo "intel nuc Server !"
		docker run -it -d -p 8000:8000 --name plogging-app -e APP_ENCRYPTION_PASSWORD=plogging-pw -v /data_1/ploggingImgs:/mnt/Plogging_server/images plogging-app-img	
    elif [ "${ip}" = "192.168.0.9" ]; then 
        echo "Rasberry Pi Server !"
		docker run -it -d -p 8000:8000 --name plogging-app -e APP_ENCRYPTION_PASSWORD=plogging-pw -v /home/ubuntu/exhard/ploggingImgs:/mnt/Plogging_server/images plogging-app-img
    else 
        echo "please check Server Ip"
    fi
else 
	echo "please check branchName"
fi

