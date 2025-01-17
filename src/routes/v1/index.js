module.exports = function (conf, obj, locales) {
    const express = require('express');
    const router = express.Router();

    const services = require('./services.js')(conf, obj);
    const users = require('./users.js')(conf, obj, locales);
    const terms = require('./terms.js')(conf, obj);

    router.use('/services', services);
    router.use('/users', users);
    router.use('/terms', terms);

    return router;
}