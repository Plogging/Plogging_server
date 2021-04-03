const moment = require('moment');
const momentTimeZone = require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

module.exports = {
    getCurrentDateTime: function () {   
        const now = moment().format('YYYYMMDDHHmmss');
        return now;
    }
};