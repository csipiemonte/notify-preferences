module.exports = function (conf, obj, locales) {

    const logger = obj.logger();
    const db = obj.db();
    const Utility = obj.utility();
    const buildQuery = obj.query_builder();

    const express = require('express');
    const router = express.Router();

    var escape = require('escape-html');
    var fs = require("fs");
    const Joi = require('joi');

    /**
     * check the input of the user for contacts
     */
    function checkContacts(userContacts) {

        const contactsSchema = Joi.object({
            sms: Joi.string()
                .trim()
                .allow(null),
            phone: Joi.string()
                .trim()
                .allow(null),
            email: Joi.string()
                .trim()
                .email()
                .allow(null),
            push: Joi.object()
                .allow(null),
            language: Joi.string()
                .trim()
                .valid(...Object.keys(locales))
                .allow(null),
            interests: Joi.string()
                .trim()
                .allow(null),
            user_id: Joi.string(),
            terms: Joi.object()
        });

        return contactsSchema.validate(userContacts, {abortEarly: false});
    }

    function checkServiceName (serviceName) {
        return Joi.string().pattern(/^[a-zA-Z0-9_\-]*$/).validate(serviceName);
    }

    function parseContact(user){
        if(!user || user === null) return user;
        if (user.push && user.push !== "") user.push = JSON.parse(user.push);
        return user;
    }

    /**
     * get user's contacts
     */
    router.get('/:user_id/contacts', async function (req, res, next) {
        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        var query = "";
        try {
            query = buildQuery.select("user_id, sms, phone, email, push, language, interests").table("users").filter({"user_id": {"eq": user_id}, "tenant": {"eq": tenant}}).sql;
            var queryTerms = buildQuery.select("accepted_at, hashed_terms").table("users_terms").filter({"user_id": {"eq": user_id}, "tenant": {"eq": tenant}}).sql;
        } catch (err) {
            return next({type: "client_error", status: 400, message: escape(err.message)});
        }

        try {
            var result = await db.execute(query);
            var resultTerms = await db.execute(queryTerms);
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)});
        }

        if (!result || result.length === 0 || !resultTerms || resultTerms.length === 0)
            return next({type: "info", status: 404, message: "no contacts for " + escape(req.params.user_id)});

        let user = result[0];
        let userTerms = resultTerms[0];

        user = parseContact(user);
        user.user_id = req.params.user_id;
        user.terms = userTerms;
        next({type: "ok", status: 200, message: user});
    });

    /**
     *  insert or update contacts of user
     */
    router.put('/:user_id/contacts', async function (req, res, next) {
        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        try {
            let select_query = buildQuery.select().table("users_terms").filter({"user_id":{"eq": user_id}, "tenant": {"eq": tenant}}).sql;
            var select_result = await db.execute(select_query);
            if(!select_result[0] || select_result[0] === null) return next({type: "client_error", status: 412, message: "The user didn't accept the terms of service"});
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)});
        }

        let resCheck = checkContacts(req.body);
        if(resCheck.error) {
            return next({
                type: "client_error",
                status: 400,
                message: escape(resCheck.error.message),
                body: req.body
            })
        }
        let user = resCheck.value;

        if(user.push) {
            // clean up push token
            try {
                let getStoredPushTokensSql = buildQuery.select("push").table("users").filter({"user_id":{"eq": user_id}, "tenant": {"eq": tenant}}).sql;
                logger.trace("get stored push tokens sql:", getStoredPushTokensSql);

                let getStoredPushTokensResult = await db.execute(getStoredPushTokensSql);
                logger.trace("get stored push tokens result:", getStoredPushTokensResult);

                if(getStoredPushTokensResult && getStoredPushTokensResult.length > 0 && getStoredPushTokensResult[0].push) {

                    let cleanedPushTokens = {}
                    // iterate through services
                    for(let service of Object.keys(user.push)) {

                        let storedServicePushTokens = JSON.parse(getStoredPushTokensResult[0].push)[service];
                        let servicePushTokens = [];

                        if(storedServicePushTokens) {
                            // iterate through service's tokens
                            for(let currentServicePushToken of user.push[service]){
                                if(!storedServicePushTokens.includes(currentServicePushToken))
                                    servicePushTokens.push(currentServicePushToken);
                            }
                        }
                        cleanedPushTokens[service] = servicePushTokens.length > 0 ? servicePushTokens : user.push[service];
                    }
                    logger.debug("cleaned push tokens:", cleanedPushTokens);
                    user.push = cleanedPushTokens;
                }
            } catch (e) {
                logger.error("error cleaning push tokens", e);
            }
        }

        try {
            var sql_insert_s = "INSERT INTO users_s (select user_id, sms, phone, email, push, language, interests, to_timestamp(" + new Date().getTime() + "* 0.001), tenant from users where user_id = '" + user_id + "' AND tenant = '" + tenant + "')";
            sql_insert_s = sql_insert_s + " ON CONFLICT ON CONSTRAINT users_s_pk DO NOTHING";

            var sql_insert = buildQuery.insert().table("users").values({
                user_id: user_id,
                sms: user.sms,
                email: user.email,
                push: JSON.stringify(user.push),
                phone: user.phone,
                language: user.language,
                interests: user.interests,
                tenant: tenant
            }).sql;
            let sql_update =  buildQuery.update().set(["sms", "email", "push", "phone", "language", "interests"],[user.sms, user.email, JSON.stringify(user.push), user.phone, user.language, user.interests]).sql;
            sql_insert = sql_insert + " ON CONFLICT ON CONSTRAINT users_pk do " + sql_update;
            
            var select_sql = buildQuery.select("user_id, sms, phone, email, push, language, interests").table("users").filter({
                "user_id": {"eq": user_id},
                "tenant": {"eq": tenant}
            }).sql;
        } catch (err) {
            return next({type: "client_error", status: 400, message: "the request is not correct", body: err})
        }

        logger.debug("Executing sql:", sql_insert_s + ";" + sql_insert + ";" + select_sql + ";")
        try {
            var result = await db.execute(sql_insert_s + ";" + sql_insert + ";" + select_sql + ";");
            let user = parseContact(result[2][0]);
            user.user_id = req.params.user_id;
            return next({type: "ok", status: 200, message: user})
        } catch (err) {
            logger.error(JSON.stringify(err));
            return next({type: "db_error", status: 500, message: escape(err.message)})
        }
    });

    /**
     *  get the preferences of the specified user for the specified service
     */
    router.get('/:user_id/preferences/:service_name', async function (req, res, next) {
        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        // validate service name
        let serviceValidation = checkServiceName(req.params.service_name);
        if(serviceValidation.error) {
            return next({
                type: "client_error",
                status: 400,
                message: escape(serviceValidation.error.message),
                body: {}
            });
        }

        let filter = {
            "user_id": {"eq": user_id},
            "tenant": {"eq": tenant},
            "service_name": {"eq": req.params.service_name}
        };
        try {
            var user_services_sql = buildQuery.select("uuid, user_id, service_name, channels").table('users_services').filter(filter).sql;
            var service_sql = buildQuery.select().table('services').filter({"name": {"eq": req.params.service_name}, "tenant": {"eq": tenant}}).sql;
            var user_sql = buildQuery.select().table('users').filter({"user_id": {"eq": user_id}, "tenant": {"eq": tenant}}).sql;
        } catch (err) {
            return next({type: "client_error", status: 400, message: "the request is not correct", body: err})
        }

        try {
            var result = await db.execute(user_services_sql + ";" + service_sql + ";" + user_sql);
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)})
        }

        var service = result[1][0];
        if (!service) return next({type: "client_error", status: 404, message: "service doesn't exist"});
        var user = result[2][0];
        if (!user) return next({type: "client_error", status: 404, message: "user doesn't exist"});
        var user_services = result[0][0];
        if (!user_services) return next({type: "info", status: 404, message: "user preferences for this service not found"});
        /* filter only the channels chosen from user that are available in the service*/
        if(user_services.channels && user_services.channels !== "") {
            let channelsPossibles = (user_services.channels.split(",")).filter(e => (service.channels.split(",")).includes(e));
            user_services.channels = channelsPossibles.join(",");
        }
        user_services.user_id = req.params.user_id;
        next({type: "ok", status: 200, message: user_services});
    });

    /**
     *  insert or update preferences of service
     */
    router.put('/:user_id/preferences/:service_name', async function (req, res, next) {
        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        // validate service name
        let serviceValidation = checkServiceName(req.params.service_name);
        if(serviceValidation.error) {
            return next({
                type: "client_error",
                status: 400,
                message: escape(serviceValidation.error.message),
                body: req.body
            });
        }

        //validate input
        const preferenceSchema = Joi.object({
            channels: Joi.string()
                .trim()
                .allow(null, '')
                .required()
        });
        let validation = preferenceSchema.validate(req.body, {abortEarly: false});
        if(validation.error) {
            return next({
                type: "client_error",
                status: 400,
                message: escape(validation.error.message),
                body: req.body
            });
        }
        let body = validation.value;

        try {
            // TODO check if the user accepted the terms
            var sql_services = buildQuery.select().table("services").filter({"name": {"eq": req.params.service_name}, "tenant": {"eq": tenant}}).sql;
            var sql_insert_s = "INSERT INTO users_services_s (select uuid, user_id, service_name, channels, to_timestamp(" + new Date().getTime() + "* 0.001), tenant from users_services where user_id = '" + user_id + "' and service_name = '" + req.params.service_name + "' AND tenant = '" + tenant + "')";
            var sql_delete = buildQuery.delete().table("users_services").filter({
                "user_id": {"eq": user_id},
                "tenant": {"eq": tenant},
                "service_name": {"eq": req.params.service_name}
            }).sql;
            var sql_insert = buildQuery.insert().table("users_services").values({
                uuid: Utility.uuid(),
                user_id: user_id,
                service_name: req.params.service_name,
                channels: body.channels,
                tenant: tenant
            }).sql;
            if(body.channels === null || body.channels === "") sql_insert = "";
        } catch (err) {
            return next({type: "client_error", status: 400, message: "the request is not correct", body: err})
        }

        let total_query = sql_insert_s + "; " + sql_delete + "; " + sql_insert + ";";

        try {
            let service = await db.execute(sql_services);
            service = service[0];
            if(!service) return next({type: "client_error", status: 400, message: "the service '" + escape(req.params.service_name) + "' doesn't exist"});
            await db.execute(total_query);
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)});
        }
        next({type: "ok", status: 200, message: "OK"});
    });

    /**
     *  get the preferences of the specified user for all the services
     */
    router.get('/:user_id/preferences', async function (req, res, next) {

        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        try {
            let filter = {
                "us.user_id": {"eq": user_id},
                "us.tenant": {"eq": tenant}
            };
            var user_services_sql = buildQuery.select("us.uuid, us.user_id, us.service_name, us.channels").table('users_services as us').join().table("services as s").on("us.service_name=s.name AND us.tenant=s.tenant").filter(filter).sql;
            filter = {
                "user_id": {"eq": user_id},
                "tenant": {"eq": tenant}
            };
            var user_sql = buildQuery.select().table('users').filter(filter).sql;
        } catch (err) {
            return next({type: "client_error", status: 400, message: "the request is not correct", body: err})
        }

        try {
            var result = await db.execute(user_services_sql + ";" + user_sql);
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)})
        }

        var user = result[1][0];
        if (!user) return next({type: "client_error", status: 404, message: "user doesn't exist"});
        var user_services = result[0];
        user_services = user_services.map(e => {
            e.user_id = req.params.user_id;
            return e;
        });
        next({type: "ok", status: 200, message: user_services});
    });

    /**
     *  insert or update preferences of service
     */
    router.put('/:user_id/preferences', async function (req, res, next) {

        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        //validate input
        const servicesPreferencesSchema = Joi.object()
            .pattern(
                Joi.string()
                    .pattern(/^[a-zA-Z0-9_\-]*$/),
                Joi.string()
                    .trim()
                    .pattern(/^[a-zA-Z,]*$/)
                    .allow(null, '')
            );
        let validation = servicesPreferencesSchema.validate(req.body, {abortEarly: false});
        if(validation.error) {
            return next({
                type: "client_error",
                status: 400,
                message: escape(validation.error.message),
                body: req.body
            });
        }
        let services = validation.value;

        await Object.keys(services).forEach(async service_name => {

            if (!services[service_name]) services[service_name] = "";

            try {
                var sql_insert_s = "INSERT INTO users_services_s (select uuid, user_id, service_name, channels, to_timestamp(" + new Date().getTime() + "* 0.001), tenant from users_services where user_id = '" + user_id + "' and service_name = '" + service_name + "' and tenant = '" + tenant + "')"
                var sql_delete = buildQuery.delete().table("users_services").filter({
                    "user_id": {"eq": user_id},
                    "tenant": {"eq": tenant},
                    "service_name": {"eq": service_name}
                }).sql;
                var sql_insert = buildQuery.insert().table("users_services").values({
                    uuid: Utility.uuid(),
                    user_id: user_id,
                    service_name: service_name,
                    channels: services[service_name],
                    tenant: tenant
                }).sql;
                if(services[service_name] === null || services[service_name] === "") sql_insert = "";
            } catch (err) {
                return next({type: "client_error", status: 400, message: "the request is not correct", body: err})
            }

            let total_query = sql_insert_s + "; " + sql_delete + "; " + sql_insert + ";";

            try {
                await db.execute(total_query);
            } catch (err) {
                return next({type: "db_error", status: 500, message: escape(err.message)});
            }
        })
        next({type: "ok", status: 200, message: "OK"});
    });

    /**
     *  get contacts of user for the only available channels the he has chosen
     */
    router.get('/:user_id/contacts/:service', async function (req, res, next) {

        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        // validate service name
        let serviceValidation = checkServiceName(req.params.service);
        if(serviceValidation.error) {
            return next({
                type: "client_error",
                status: 400,
                message: escape(serviceValidation.error.message),
                body: {}
            });
        }

        var filter = {
            "u.user_id": {"eq": user_id},
            "us.service_name": {"eq": req.params.service},
            "u.tenant": {"eq": tenant}
        };

        try {
            //var sql = buildQuery.select().table("( select u.user_id, us.channels, u.email, u.sms, u.push,us.service_name from users_services us,users u where u.user_id = us.user_id ) t").filter(filter).sql;
            var checkUser = buildQuery.select().table("users").filter({"user_id": {"eq": user_id}, "tenant": {"eq": tenant}}).sql;
            var sql = buildQuery.select("u.user_id, us.channels, u.email, u.sms, u.push,us.service_name").table("users u")
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

    /**
     *  accept user terms
     */
    router.put('/:user_id/terms', async function (req, res, next) {
        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        //validate input
        const termsSchema = Joi.object({
            hash: Joi.string()
                .trim()
                .alphanum()
                .required()
        });
        let validation = termsSchema.validate(req.body, {abortEarly: false});
        if(validation.error) {
            return next({
                type: "client_error",
                status: 400,
                message: escape(validation.error.message),
                body: req.body
            });
        }
        let document_hash = validation.value;

        try {
            var terms = fs.readFileSync(process.cwd() + "/terms/terms" + (process.env.SUB_ENVIRONMENT ? '.' + process.env.SUB_ENVIRONMENT : ''), 'utf8');
        } catch (err) {
            return next({type: "system_error", status: 500, message: escape(err.message)});
        }

        let termsCrypted = Utility.hashMD5(terms);

        if(termsCrypted !== document_hash.hash) return next({type: "client_error", status: 400, message: "the hash of terms is wrong", body: {}});

        try {
            let sql_insert_s = "INSERT INTO users_terms_s (select user_id, accepted_at, hashed_terms, to_timestamp(" + new Date().getTime() + "* 0.001), tenant from users_terms where user_id = '" + user_id +
                "' and tenant = '" + tenant + "')";
            let sql_delete = buildQuery.delete().table("users_terms").filter({
                "user_id": {"eq": user_id},
                "tenant": {"eq": tenant}
            }).sql;
            let sql_insert = buildQuery.insert().table("users_terms").values({
                user_id: user_id,
                accepted_at: new Date().toISOString(),
                hashed_terms: document_hash.hash,
                tenant: tenant
            }).sql;
            let select_query = buildQuery.select("accepted_at, hashed_terms").table("users_terms").filter({"user_id":{"eq": user_id}, "tenant": {"eq": tenant}}).sql;

            logger.debug("accept terms sql:", sql_insert_s + ";" + sql_delete + ";" + sql_insert + ";" + select_query);
            var select_result = await db.execute(sql_insert_s + ";" + sql_delete + ";" + sql_insert + ";" + select_query);

            let user = select_result[3][0];
            return next({type: "ok", status: 200, message: user});
        } catch (err) {
            logger.error("error accepting terms.", err);
            return next({type: "db_error", status: 500, message: escape(err.message)});
        }
    });

    /**
     * get user's terms
     */
    router.get('/:user_id/terms', async function (req, res, next) {
        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        try {
            let select_query = buildQuery.select("accepted_at, hashed_terms").table("users_terms").filter({"user_id":{"eq": user_id}, "tenant": {"eq": tenant}}).sql;
            var select_result = await db.execute(select_query);

            if(!select_result[0] || select_result[0] === null) return next({type: "client_error", status: 404, message: "User not found"});

            let user = select_result[0];
            return next({type: "ok", status: 200, message: user});
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)});
        }
    });

    /**
     *  historicize user
     */
    router.delete('/:user_id', async function (req, res, next) {

        let user_id = Utility.hashMD5(req.params.user_id);
        let tenant = req.auth.tenant ? req.auth.tenant : conf.defaulttenant;

        try {
            let filter = {
                "user_id": {"eq": user_id},
                "tenant": {"eq": tenant}
            }
            let sql_insert_s = "INSERT INTO users_s (select user_id, sms, phone, email, push, language, interests, to_timestamp(" + new Date().getTime() + "* 0.001), tenant from users where user_id = '" + user_id + "' and tenant = '" + tenant + "')";
            sql_insert_s = sql_insert_s + " ON CONFLICT ON CONSTRAINT users_s_pk DO NOTHING";
            let sql_delete_user = buildQuery.delete().table("users").filter(filter).sql;
            let sql_insert_terms_s = "INSERT INTO users_terms_s (select user_id, accepted_at, hashed_terms, to_timestamp(" + new Date().getTime() + "* 0.001), tenant from users_terms where user_id = '" + user_id + "' and tenant = '" + tenant + "')";
            let sql_delete_terms = buildQuery.delete().table("users_terms").filter(filter).sql;
            let sql_delete_user_preferences = buildQuery.delete().table("users_services").filter(filter).sql;

            let total_query = sql_insert_s + "; " + sql_delete_user + "; " + sql_insert_terms_s + ";" + sql_delete_terms + ";" + sql_delete_user_preferences + ";";

            await db.execute(total_query);
            return next({type: "ok", status: 200, message: "OK"});
        } catch (err) {
            return next({type: "db_error", status: 500, message: escape(err.message)});
        }
    });

    return router;
}