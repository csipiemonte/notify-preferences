var commons = require("../../commons/src/commons");
const conf = commons.merge(require('./conf/preferences'), require('./conf/preferences-' + (process.env.ENVIRONMENT || 'localhost')));
const obj = commons.obj(conf);
const logger = obj.logger();
const locales = commons.locales;

var prefix = "/api";

var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.disable('x-powered-by');
// configure body parser
app.use(bodyParser.json());

app.use((req, res, next) => {
    // Set the timeout for all HTTP requests
    req.setTimeout(30000, () => {
        logger.error('Request has timed out.');
        res.send(408);
    });
    // Set the server response timeout for all HTTP requests
    res.setTimeout(30000, () => {
        logger.error('Response has timed out.');
        res.send(503);
    });

    res.set("Content-Security-Policy", "default-src 'none'");

    next();
});

// initialize response time header
app.use(function (req, res, next) {
    res.set("X-Response-Time", new Date().getTime());
    next();
});

// check basic authorization
const security_checks = obj.security_checks();
app.use(prefix + '/v2', security_checks.checkBasicAuth);

if (conf.security) {
    if (conf.security.blacklist) obj.blacklist(app);

    var permissionMap = [];
    if (conf.security.resourcesPermissions) permissionMap = conf.security.resourcesPermissions;

    obj.security(permissionMap, app);
}

// configure api versions
const apiv1 = require('./api_v1.js'); //./api_v1.js
const apiv2 = require('./api_v2.js'); //./api_v2.js
apiv1(conf, app, obj, locales);
apiv2(conf, app, obj, locales);

app.use(function (req, res, next) {
    next({ type: "error", status: 404, message: {code: 404, description: "resource not found"}});
});

obj.response_handler(app);

app.listen(conf.server_port, function () {
    logger.info("environment:", JSON.stringify(process.env, null, 4));
    logger.info("configuration:", JSON.stringify(conf, null, 4));
    logger.info("%s listening on port: %s", conf.app_name, conf.server_port);
});
