const moment = require('moment');
const momentTimeZone = require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

module.exports = {
    getCurrentDateTime: function () {
        const now = moment().format('YYYYMMDDHHmmss');
        return now;
    },
    checkPloggingWeek: function (ploggingCreatedTimestamp, now) { // ploggingCreatedTimestamp의 날짜가 이번주인지 체크
        const ploggingCreatedDate = Number(ploggingCreatedTimestamp.slice(0, 8)); // 20210407112345
        const [startThisWeekDate, endThisWeekDate] = calStartEndPloggingWeekDate(now);
     
        if (startThisWeekDate <= ploggingCreatedDate && ploggingCreatedDate <= endThisWeekDate) return true;
        else return false;
    },
    checkPloggingMonth: function (ploggingCreatedTimestamp, now) { // ploggingCreatedTimestamp의 날짜가 이번달인지 체크
        const ploggingCreatedDate = ploggingCreatedTimestamp.slice(0, 6); // 20210407112345
        let nowYear = now.getFullYear();
        let nowMonth = now.getMonth() + 1;

        if (nowMonth < 10) nowMonth = '0' + nowMonth;
        else nowMonth = nowMonth + "";

        if (ploggingCreatedDate === (nowYear + nowMonth)) return true;
        else return false;
    },
    calStartEndPloggingWeekDate : function(now) { // 이번주 시작, 마지막일 구하기
        const nowDayOfWeek = now.getDay(); // 요일
        let nowDay = now.getDate(); // 날짜
        const nowMonth = now.getMonth() + 1;
        const nowYear = now.getFullYear();
        return calThisWeek(nowDayOfWeek, nowYear, nowMonth, nowDay);
    },
    calStartEndPloggingMonthDate : function(now) { // 이번달 시작, 마지막 일 구하기
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const thisMonthFirstDate = 1;
        const thisMonthLastDate = new Date(year, month, 0).getDate(); // 이번달 마지막일
        return [thisMonthFirstDate, thisMonthLastDate];
    }
};

function calThisWeek(dayOfWeek, year, month, date) {

    let startYear = year
    let endYear = year;
    let startMonth = month;
    let endMonth = month;
    let startDate = date; // 금주 월요일 날짜
    let endDate = date; // 금주 일요일 날짜
    let thisMonthLastDate = new Date(year, month, 0).getDate(); // 이번달 마지막일
    let preMonthLastDate = new Date(year, month - 1, 0).getDate(); // 저번달 마지막일

    // 한 주를 월-일로 체크
    if (dayOfWeek === 0) { // 일요일
        startDate = date - 6;
        endDate = date;
    }
    else if (dayOfWeek === 1) { // 월요일
        startDate = date;
        endDate = date + 6;
    }
    else if (dayOfWeek === 2) { // 화요일
        startDate = date - 1;
        endDate = date + 5;
    }
    else if (dayOfWeek === 3) { // 수요일
        startDate = date - 2;
        endDate = date + 4;
    }
    else if (dayOfWeek === 4) { // 목요일
        startDate = date - 3;
        endDate = date + 3;
    }
    else if (dayOfWeek === 5) { // 금요일
        startDate = date - 4;
        endDate = date + 2
    }
    else if (dayOfWeek === 6) { // 토요일
        startDate = date - 5;
        endDate = date + 1;
    }

    // 첫주 예외처리
    if (startDate <= 0) {
        // 1월에서 -하면 전년도 12월 (년, 월 동시에 바뀜)
        if (month === 1) {
            startYear -= 1;
            startMonth = 12;
            startDate = preMonthLastDate + startDate;
        }
        else {
            startMonth -= 1;
            startDate = preMonthLastDate + startDate;
        }
    }

    // 마지막주 예외처리
    if (thisMonthLastDate < endDate) {
        // 12월에서 +하면 다음년 1월 (년, 월 동시에 바뀜)
        if (month === 12) {
            endYear += 1;
            endMonth = 1;
            endDate = endDate - thisMonthLastDate;
        } else { // 월만 바뀜
            endMonth += 1;
            endDate = endDate - thisMonthLastDate;
        }
    };

    // number -> string
    startDate += "";
    endDate += "";

    if(startMonth < 10) startMonth = '0' + startMonth;
    if(startDate < 10) startDate = '0' + startDate;
    if(endMonth < 10) endMonth = '0' + endMonth;
    if(endDate < 10 ) endDate = '0' + endDate;

    return [startYear+startMonth+startDate, endYear+endMonth+endDate];
};