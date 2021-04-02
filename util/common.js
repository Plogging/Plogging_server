const moment = require('moment');
const momentTimeZone = require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

module.exports = {
    getCurrentDateTime: function () {   
        const now = moment().format('YYYYMMDDHHmmss');
        return now;
    },
    checkPloggingWeek: function(ploggingCreatedTimestamp) {

        const ploggingCreatedDate = Number(ploggingCreatedTimestamp.slice(0,8)); // 20210407112345
        const now = new Date();
        const nowDayOfWeek = now.getDay();
        const nowDay = now.getDate();
        const nowMonth = now.getMonth();
        const nowYear = now.getYear();
        const weekStartDate = new Date(nowYear, nowMonth, nowDay - nowDayOfWeek + 1);
        const weekEndDate = new Date(nowYear, nowMonth, nowDay + (7 - nowDayOfWeek));

        /**
         * 지우려는 산책날짜가 이번주일 경우 true -> 점수 차감 O
         * 지울려는 산책날짜가 이번주가 아닐경우 false -> 점수 차감 
         */
        if(formatDate(weekStartDate) <= ploggingCreatedDate && ploggingCreatedDate <= formatDate(weekEndDate)) return true;
        else return false;
    },
    checkPloggingMonth: function( ) {
        const ploggingCreatedDate = Number(ploggingCreatedTimestamp.slice(0,6)); // 20210407112345
        const now = new Date();
        const nowMonth = now.getMonth();
        let nowYear = now.getYear();

        const monthStartDate = Number(new Date(nowYear, nowMonth, 1));
        const monthEndDate = Number(new Date(nowYear, nowMonth+1, 0));

/**
         * 지우려는 산책날짜가 이번달일 경우 true -> 점수 차감 O
         * 지울려는 산책날짜가 이번달이 아닐경우 false -> 점수 차감 
         */
        if(formatDate(monthStartDate) <= ploggingCreatedDate && ploggingCreatedDate <= formatDate(monthEndDate)) return true;
        else return false;
    }
};

function formatDate(date) {
    let mymonth = date.getMonth()+1;
    let myweekday = date.getDate();

    if(mymonth < 10) mymonth = "0" + mymonth;
    if(myweekday < 10) myweekday = "0" + myweekday;
    
    return (mymonth + myweekday);
}
