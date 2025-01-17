
module.exports = function (conf, obj, locales) {

    const logger = obj.logger();
    const db = obj.db();
    const buildQuery = obj.query_builder();

    const express = require('express');
    const router = express.Router();

    const Joi = require('joi');

    const { createHash } = require('crypto');

    /**
    * check the input
    */
    function checkCFs(input) {

        const arraySchema = Joi.array()
            .items(
                Joi.string()
                .uppercase()
                .pattern(/^[0-9A-Z]{16}$/)
            )
            .min(1);

        return arraySchema.validate(input, {abortEarly: false});
    }

    /**
     * get service's subscribers
     */
    router.post('/channels/io', async function (req, res, next) {
        
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;
        let serviceName = req.auth.preference_service_name;

        let resValidate = checkCFs(req.body);
        if(resValidate.error) {
            return next({
                type: "client_error",
                status: 400,
                message: {code: 400, description: resValidate.error.message},
                body: req.body
            });
        }
        let cfs = resValidate.value;

        let cfHashMap = {}
        try {
            cfs.forEach(element => {
                let hash = createHash('sha256').update(element).digest('hex').toLowerCase();
                logger.debug("element [%s] hash [%s]", element, hash);
                cfHashMap[element] = hash;
            });

            let query = buildQuery.select("subscriber").table("ioapp_subscriptions_feed").filter({
                service_name: { eq: serviceName },
                tenant: { eq: tenant},
                subscriber: {in: Object.values(cfHashMap)}
            }).sql;;
            logger.debug("get subscribers sql:", query);
            var result = await db.execute(query);
        } catch (err) {
            logger.error(err);
            return next({type: "db_error", status: 500, message: {code: 500, description: err.message}});
        }
        logger.debug("query result:", result);

        let resultArray = [];
        result.forEach(e => resultArray.push(e.subscriber));
        logger.debug("array result:", resultArray);

        let response = [];
        for(let cf of cfs){
            response.push({
                user_id: cf,
                enabled: resultArray.includes(cfHashMap[cf])
            });
        }

        next({type: "ok", status: 200, message: response});
    });

    return router;
}