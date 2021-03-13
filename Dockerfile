FROM node:12

WORKDIR /mnt/Plogging_server

COPY . .

RUN npm install --production

RUN npm install pm2 -g

ENV TZ=Asia/Seoul

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime

EXPOSE 8080

CMD ["pm2-runtime", "start", "start.config.js", "--env", "development"]
