'use strict';

var http = require('http');
var logger = require('./lib/logger.js');
var Controller = require('./lib/controller.js');
var helper = require('./lib/helper.js');
var config = require('./config.json');
/* Setting Defaults */
var argv = helper.getArguments(process.argv);

helper.extend(config, argv, {
    mediaDirectory: __dirname + config.mediaFolder,
    publicDirectory: __dirname + '/public/',
    albumartDirectory: __dirname + '/albumart/',
    adminList: argv.a || argv.adminlist,
    playerClient: config.playerClient,
    port: argv.p
});

var server = http.createServer();

new Controller(server, config);

//enable profiling
if (config.profile) {
    var memwatch = require('memwatch');

    memwatch.on('leak', function (info) {
        logger.info('leak', info);
    });

    memwatch.on('stats', function (stats) {
        logger.info('stats', stats);
    });

    memwatch.on('leak', function (info) {
        logger.info('leak', info);
    });
}

server.listen(config.port);

logger.info('Server started on port: %d with pid %d', config.port, process.pid);
