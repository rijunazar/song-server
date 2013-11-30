'use strict';
var formidable = require('formidable');
var logger = require('./logger.js');
var memwatch = require('memwatch');

var logStats = (function () {
    var timer,
        diff = null;

    return function (songServer) {
        clearTimeout(timer);
        timer = setTimeout(function () {
            if (diff === null) {
                diff = new memwatch.HeapDiff();
            } else {
                logger.log('info', diff.end());
                diff = null;
            }

            logger.log('info', songServer.getStats());
            //websock.sockets.in('users').emit('stats', songServer.getStats());
        }, 3000);
    };
})();


function Controller(server, config) {
    this.config = config;
    this.httpServer = server;
    this.staticServer = null;
    this.mediaServer = null;
    this.albumartServer = null;
    this.songServer = null;
    this.socket = null;
    this.init();
}

Controller.prototype = {
    init: function () {
        var SongServer = require('./songServer.js');

        this.songServer = new SongServer({
            directory: this.config.mediaDirectory,
            adminList: this.config.adminList,
            playerClient: this.config.playerClient
        });

        this.initHttpServer();
        this.initSocket();
    },

    initHttpServer: function () {
        this.createStaticServer();
        this.httpServer.on('request', this._requestHandler.bind(this));
    },

    handleFileUpload: function (request, response) {
        var form = new formidable.IncomingForm();
        try {
            form.parse(request, this._saveFile.bind(this, response));
        } catch (ex) {
            console.log(ex);
            response.end('error');
        }
    },

    _saveFile: function (response, err, fields, files) {
        if (!err) {
            this.songServer.saveSongs(files);
            this.songServer.once('songsSaved', function () {
                response.end('ok');
            });
        } else {
            response.end('error');
        }
    },

    serveMedia: function (url, request, response) {
        if (this.mediaServer === null) {
            var staticServer = require('node-static');
            this.mediaServer = new staticServer.Server(this.config.mediaDirectory);
        }
        var responseHeader = {'Content-disposition': 'attachment; filename=' + url};

        this.mediaServer.serveFile(decodeURIComponent(url), 200, responseHeader, request, response);
    },

    serveAlbumart: function (url, request, response) {
        var responseHeader = {};

        this.albumartServer.serveFile(decodeURIComponent(url), 200, responseHeader, request, response);
    },


    createStaticServer: function () {
        var staticServer = require('node-static');
        this.staticServer = new staticServer.Server(this.config.publicDirectory);
        this.albumartServer = new staticServer.Server(this.config.albumartDirectory);
    },

    _requestHandler: function (request, response) {
        var url = request.url;

        if (url === '/upload') {
            this.handleFileUpload(request, response);
        } else if (url.indexOf('/mediaFiles') === 0) {
            url = url.replace('/mediaFiles/', '');
            this.serveMedia(url, request, response);
        }  else if (url.indexOf('/albumart') === 0) {
            url = url.replace('/albumart/', '');
            this.serveAlbumart(url, request, response);
        } else {
            this.staticServer.serve(request, response);
        }
    },

    initSocket: function () {
        var socketio = require('socket.io');
        var socket = this.socket = socketio.listen(this.httpServer);
        var songServer = this.songServer;

        var broadcast = function (event, data) {
            socket.sockets.in('users').emit(event, data);
            logStats(songServer);
        };

        socket.configure(function () {
            this.disable('log');
            this.set('authorization', function (handshakeData, callback) {
                var ip = handshakeData.address.address;
                var name =  handshakeData.query.name;

                songServer.connectUser(ip, name);
                callback(null, true);
            });
        });

        socket.on('connection', this._handleSocketConnection.bind(this));

        songServer.on('mediaListChange', function (list) {
            broadcast('mediaListChange', list.toJSON());
        });

        songServer.on('playListChange', function (playlist) {
            broadcast('playListChange', playlist.toJSON());
        });

        songServer.on('nowPlaying', function (media) {
            broadcast('nowPlaying', media.toJSON());
        });

        songServer.on('end', function (media) {
            broadcast('end', media.toJSON());
        });
        
    },

    _handleSocketConnection: function (socket) {
        var songServer = this.songServer;
        var ip = socket.handshake.address.address;
        var user = songServer.connectUser(ip);

        socket.join('users');

        logStats(songServer);

        socket.emit('init', {
            playList: songServer.getPlayList().toJSON(),
            mediaList: songServer.getMediaList().toJSON(),
            user: user.toJSON(),
            nowPlaying: songServer.getCurrentMedia(true)
        });



        socket.on('disconnect', function () {
            songServer.disConnectUser(user);
            this.removeAllListeners();  //experimental
            this.leave('users'); //experimental
            logStats(songServer);
            songServer = null;
        });

        socket.on('songSelected', function (song) {
            var name = song.name,
                result;

            result = songServer.enqueue(name, user);
            if (result instanceof Error) {
                this.emit('error', {
                    message: result.message,
                    song: song
                });
            }
        });

        socket.on('userNameChange', function (name) {
            user.setName(name);
        });

        socket.on('songRemoved', function (song) {
            var result = songServer.dequeue(song, user);
            if (result instanceof Error) {
                this.emit('error', result);
            }
        });

        socket.on('skipSong', function () {
            var result = songServer.skipSong(user);
            if (result instanceof Error) {
                this.emit('error', {
                    message: result.message
                });
            }
        });

        socket.on('upVote', function (song) {
            var result = songServer.upVote(song, user);
            if (result instanceof Error) {
                this.emit('error', {
                    message: result.message,
                    song: song,
                    action: 'upvote'
                });
            }
        });

        socket.on('downVote', function (song) {
            var result = songServer.downVote(song, user);
            if (result instanceof Error) {
                this.emit('error', {
                    message: result.message,
                    song: song,
                    action: 'downvote'
                });
            }
        });

    }
};

module.exports = Controller;