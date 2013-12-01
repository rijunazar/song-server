'use strict';

var Player = require('./player.js'),
    exec = require('child_process').exec;

module.exports = Player.extend({
    playMedia: function (media) {
        var command = 'mplayer -novideo \'' + media.getFullPath() + '\'';
        exec(command, {maxBuffer: 1024 * 1024}, this._songComplete.bind(this));
    },

    stopPlaying: function () {
        exec('killall mplayer');
    }
});