FROM node:12

WORKDIR /mnt/Plogging_server

ENV APP_ENCRYPTION_PASSWORD plogging-pw 

COPY . .

RUN npm install --production

RUN npm install pm2 -g

ENV TZ=Asia/Seoul

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime

EXPOSE 8000

CMD ["pm2-runtime", "start", "start.config.js", "--env", "development"]
