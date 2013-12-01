/**
 * Created by riju on 24/11/13.
 */
'use strict';

var utils = require('util'),
    helper = require('../helper.js'),
    MediaList = require('../media.js').MediaList,
    Media = require('../media.js').Media,
    EventEmitter = require('events').EventEmitter,
    logger = require("../logger.js");

function MediaPlayer() {
    this.isPlaying = false;
    this.currentMedia = null;
    this.queue = new MediaList();
    EventEmitter.call(this);
}

utils.inherits(MediaPlayer, EventEmitter);


helper.extend(MediaPlayer.prototype, {

    play: function (media) {
        if (!this.isPlaying && media instanceof Media) {
            try {
                this.playMedia(media);
            } catch (e) {
                console.log(e);
            }
            this._onStart(media);
        } else {
            this._onPlayerError();
        }
    },

    playMedia: function (media) {
        //to implement
    },

    stopPlaying: function () {
        //to implement
    },

    _onStart: function (media) {
        this.isPlaying = true;
        media.play();
        this.currentMedia = media;
        this.emit('start', media);
    },

    _onPlayerError: function () {
        var e = new Error(!this.isPlaying ? 'Player busy' : 'Invalid Media');
        this._currentRating = this.getRating();
        this.emit('error', e);
    },

    _songComplete: function (err, stdout, stderr) {
        this.isPlaying = false;
        this.emit('end', err, this.currentMedia);
        this.currentMedia = null;
        this.next();
    },

    stop: function () {
        if (this.isPlaying) {
            // Executing the following exec will execute '_songComplete' callback
            try {
                this.stopPlaying();
            } catch(e) {
                logger.error(e);
            }
            this.emit('stop', this.currentMedia);
        }
    },

    getCurrentMedia: function () {
        return this.currentMedia;
    },

    enqueue: function (media) {
        if (this.queue.add(media)) {
            if (!this.isPlaying) {
                this.next();
            }
            this.sortPlaylist(true);
            this.emit('mediaQueued', media);
        }
    },

    dequeue: function (media) {
        if (this.queue.remove(media)) {
            this.sortPlaylist(true);
            this.emit('mediaRemoved', media);
        }
    },

    getqueue: function () {
        return this.queue;
    },

    next: function () {
        if (this.queue.size() > 0) {
            var media = this.queue.getNext();
            this.stop();
            this.emit('mediaRemoved', media, true);
            this.play(media);
        } else {
            this.emit('emptyQueue');
        }
    },

    sortPlaylist: function (silent) {
        var queue = this.queue;
        if (queue.size() > 0) {
            queue.sortByRating();
            if (!silent) {
                this.emit('mediaSorted');
            }
        }
    },

    getSongByName: function (name) {
        var queue = this.queue;
        return queue.getByName(name);
    },

    has: function (song) {
        return (this.queue.has(song) || (song === this.currentMedia));
    }
});

MediaPlayer.extend = function (props) {
    var oThis = this;

    var F = function () {
        if (typeof props.constructor === 'function') {
            props.constructor.apply(this, arguments);
        }
        oThis.apply(this, arguments);
    };

    utils.inherits(F, oThis);
    F.prototype.super = oThis;
    helper.extend(F.prototype, props);
    return F;
};

module.exports = MediaPlayer;



