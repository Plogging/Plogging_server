FROM node:12

WORKDIR /mnt/Plogging_server

COPY . .

RUN npm install

RUN npm install pm2 -g

EXPOSE 80

CMD ["pm2-runtime", "start", "start.config.js", "--env", "development"]