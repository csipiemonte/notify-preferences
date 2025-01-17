module.exports = function (conf, obj, locales) {

    const logger = obj.logger();
    const db = obj.db();
    const Utility = obj.utility();
    const buildQuery = obj.query_builder();

    var escape = require('escape-html');
    const express = require('express');
    const router = express.Router();

    /**
     *  get contacts of user for the only available channels the he has chosen
     */
    router.get('/:tenant_name/users/:user_id/contacts/:service', async function (req, res, next) {
        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.params.tenant_name;

        var filter = {
            "u.user_id": {"eq": user_id},
            "u.tenant": {"eq": tenant},
            "us.service_name": {"eq": req.params.service}
        };

        try {
            var checkUser = buildQuery.select().table("users").filter({"user_id": {"eq": user_id}, "tenant": {"eq": tenant}}).sql;
            var sql = buildQuery.select("u.user_id, us.channels, u.email, u.sms, u.push, us.service_name").table("users u")
                .join("LEFT").table("users_services us").on("u.user_id = us.user_id and u.tenant = us.tenant").filter(filter).sql;
        } catch (err) {
            return next({type: "client_error", status: 400, message: "the request is not correct", body: err})
        }

        try {
            var dbRes = await db.execute(checkUser + ";" + sql);
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)})
        }
        var user = dbRes[0][0];
        if(!user){
            return next({type: "info", status: 404, message: "user not found"})
        }

        var contacts = dbRes[1];

        if (contacts.length === 0) {
            return next({
                type: "info",
                status: 204,
                message: ""
            })
        }

        var result = {};
        /* compose contacts object assigning to each channels the relative user contact */
        if(contacts[0].channels) contacts[0].channels.split(",").map(e => e.trim()).forEach(e => result[e] = contacts[0][e]);

        if (result.push && result.push !== "") {
            try {
                var push = JSON.parse(result["push"]);
                push = push[req.params.service];
                if(push && push.length > 0) result.push = push;
                else delete result.push;
            } catch (err) {
                return next({type: "system_error", status: 500, message: "user push contact not a valid JSON"});
            }
        }
        next({type: "ok", status: 200, message: result});
    });

    return router;
}