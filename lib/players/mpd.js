'use strict';

var Player = require('./player.js'),
    mpd = require('mpd'),
    cmd = mpd.cmd;

module.exports = Player.extend({
    constructor: function () {
        this.client = mpd.connect({
            port:6600,
            host : "localhost"
        });

        this.client.on('system', function(name) {
            console.log("update", name);
        });
    },

    playMedia: function (media) {
        console.log(media.getFullPath());
        this.client.sendCommand(cmd('add', [media.getFullPath()]), function () {
            console.log(arguments);
        });
        //this.client.sendCommand(cmd('play'));
    },

    stopPlaying: function () {
        this.client.sendCommand(cmd('stop'));
    }
});