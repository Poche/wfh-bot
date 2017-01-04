'use strict';

var WFHBot = require('../lib/wfhbot');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var wfhbot = new WFHBot({
    token: token,
    dbPath: dbPath,
    name: name
});

wfhbot.run();