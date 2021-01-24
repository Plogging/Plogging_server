module.exports = {
    reqWrapper: function(req, act) {
        const format = { };
        format.path = "/" + act;
        format.method = req.method;
        format.query = req.query;
        format.params = req.params;
        format.body = req.body;
        return JSON.stringify(format);
    }
}