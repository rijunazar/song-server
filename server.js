'use strict';

var memwatch = require('memwatch');
var http = require('http');
var logger = require('./lib/logger.js');
var Controller = require('./lib/controller.js');

var argv = require('optimist')
    .usage('Start the Song Server.\nUsage: $0')
    .alias('p', 'port')
    .describe('p', 'Port to start server on')
    .alias('m', 'media')
    .describe('m', 'The media folder(where songs will be stored) ex : -m "/media"')
    .alias('a', 'adminlist')
    .describe('m', 'Admin ip list seperated by comma ex : -a "172.16.4.2,172.16.3.2"')
    .alias('c', 'playerClient')
    .describe('c', 'The Player to be used ex: -c "mpd", -c "mplayer", Default : mplayer')
    .alias('r', 'albumart')
    .describe('r', 'The albumart folder, to store albumart files')
    .argv;

/* Setting Defaults */

var PORT = argv.port || 8085;
var mediaFolder = argv.media || '/media/';
var adminList = (argv.adminlist && argv.adminlist.split(',')) || [];

var server = http.createServer();

new Controller(server, {
    mediaDirectory: __dirname + mediaFolder,
    publicDirectory: __dirname + '/public/',
    albumartDirectory: __dirname + '/albumart/',
    adminList: adminList,
    playerClient: argv.playerClient || 'mplayer'
})


memwatch.on('leak', function (info) {
    logger.info('leak', info);
});

memwatch.on('stats', function (stats) {
    logger.info('stats', stats);
});

memwatch.on('leak', function (info) {
    logger.info('leak', info);
});


server.listen(PORT);

logger.info('Server started on port: %d with pid %d', PORT, process.pid);
