
module.exports = {
    getCurrentDateTime: function () {
         function pad2(n) {  // always returns a string
            return (n < 10 ? '0' : '') + n;
        }
        const now = new Date();
        return now.getFullYear() +
            pad2(now.getMonth() + 1) +
            pad2(now.getDate()) +
            pad2(now.getHours()) +
            pad2(now.getMinutes()) +
            pad2(now.getSeconds());
    },
};