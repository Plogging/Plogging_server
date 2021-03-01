FROM node:12

WORKDIR /mnt/Plogging_server

COPY . .

RUN npm install --production

RUN npm install pm2 -g

EXPOSE 443

CMD ["pm2-runtime", "start", "start.config.js", "--env", "development"]
