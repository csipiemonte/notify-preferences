module.exports = function (conf, obj) {

    const logger = obj.logger();
    const db = obj.db();
    const buildQuery = obj.query_builder();

    var escape = require('escape-html');
    const express = require('express');
    const router = express.Router();

    /**
     *  Get the list of services
     */
    router.get('/', async function (req, res, next) {

        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        if (req.query.filter) try {
            var filter = JSON.parse(req.query.filter);
        } catch (err) {
            return next({type: "client_error", status: 400, message: "error in filter"});
        }
        else filter = {};

        if(!filter.tags) filter.tags = {};
        filter.tags.not_match? filter.tags.not_match += " hidden" : filter.tags.not_match = "hidden";
        if(filter.tags.not_match.split(" ").length > 2) return next({type: "client_error", status: 400, message: "error in filter: not match should contains only one token"});
        if(filter.tags.ci) {
            filter.tags.cai = filter.tags.ci;
            delete filter.tags.ci;
        }
        filter.tenant = {eq: tenant};

        var sql = buildQuery.select("uuid, name, channels, tags").table('services').filter(filter).sql;
        logger.debug("Search services query:", sql);
        try {
            var result = await db.execute(sql);
            result = result.map(e => {
                e.tags = e.tags.join(",");
                return e;
            });
            next({type: "ok", status: 200, message: result});
        } catch (err) {
            if(err.errno && err.errno === 1054) return next({type: "client_error", status: 400, message: escape(err.message)});
            return next({type: "db_error", status: 500, message: escape(err.message)});
        }
    });

    return router;
}