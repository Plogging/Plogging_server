const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { combine, timestamp, label, printf } = winston.format;
const logDir = process.env.LOG_PATH;

module.exports = function(fileName) {

  const myFormat = printf(info => {
    return `${info.timestamp} [${fileName}] [${info.level}] ${info.message}`;
  });

  const logger = winston.createLogger({
      level: 'info',
      format: combine(
        timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        label({ label: 'plogging-api-server'}),
        //winston.format.colorize(),
        winston.format.align(),
        myFormat
      ),
      transports: [
          
        // console.log
        new winston.transports.Console(),

          // info log
          new DailyRotateFile({
            level: 'info',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir + '/service',
            filename: `%DATE%.log`,
            maxSize: '100m', 
            maxFiles: '30d', 
            zippedArchive: true, 
          }),
          // error log
          new DailyRotateFile({
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir + '/error',  // error.log 파일은 /logs/error 하위에 저장 
            filename: `%DATE%.error.log`,
            maxSize: '100m', // mazSize 20mb
            maxFiles: '30d',
            zippedArchive: true,
          }),
      ],
  });

  return logger;
}