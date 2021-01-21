module.exports = {
    reqWrapper: function(req) {
        const format = { };
        format.path = req.path;
        format.method = req.method;
        format.query = req.query;
        format.params = req.params;
        format.body = req.body;
        return JSON.stringify(format);
    }
}