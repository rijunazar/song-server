"use strict";

var http = require('http');
var staticServer = require('node-static');
var socketio = require('socket.io');
var playlist = require('./Playlist.js');

var formidable = require('formidable');

var fileServer = new staticServer.Server(__dirname + '/public');
var PORT = 8085;
var mediaFolder = "/media/";

var argv = require('optimist')
    .usage('Start the Song Server.\nUsage: $0')
    .alias('p', 'port')
    .describe('p', 'Port to start server on')
    .alias('m', 'media')
    .describe('m', 'The media folder(where songs will be stored) ex : -m "/media"')
    .argv
;

/* Setting Defaults */

PORT = argv.port || PORT;
mediaFolder = argv.media || mediaFolder;

var medialist = require('./Medialist.js')(mediaFolder);


var server = http.createServer(function(request, response) {
    if (request.url === '/upload') {
        var form = new formidable.IncomingForm();
        try {
            form.parse(request, function(err, fields, files){
                medialist.saveMedia(files, function(){
                    websock.sockets.in('users').emit('medialist updated', medialist.list);
                });
                response.end('ok');
            });
        } catch(ex) {
            console.log(ex);
        }
    }else{
        fileServer.serve(request, response);
    }
});
server.listen(PORT);

var websock = socketio.listen(server);
websock.configure(function() {
    websock.disable('log');
});
websock.sockets.on('connection', function(socket) {
    socket.join('users');

    socket.emit('init', {
        playlist: playlist.list,
        medialist: medialist.list,
    });

    socket.on('song selected', function(data){
        
        var song = data.song;
        var username = data.username;
        var ip = socket.handshake.address.address;
        var ret = playlist.addSong(song, 'local', ip, username);
        
        if (ret === 0){
            if (playlist.list.length === 1){
                playlist.play();
            }
            
            websock.sockets.in('users').emit('playlist updated', playlist.list);
        }else{
            switch (ret.type) {
                case 'secondsTillNextSong':
                    socket.emit('message', 'Whao, Dont SPAM! Please wait ' 
                        + ret.time + ' seconds before adding next song');
                    break;
                case 'maxSongLimitPerIP':
                    socket.emit('message', 'You already got ' + ret.count
                        + ' songs queued, give others a chance!');
                    break;
            }
        }
    });
    
    socket.on('song removed', function(songIndex) {
        var ip = socket.handshake.address.address;
        
        if (ip === playlist.list[songIndex].addedByIP) {
            playlist.removeSong(songIndex);
            websock.sockets.in('users').emit('playlist updated', playlist.list);
        } else {
            socket.emit('message', 'Sorry, you can only remove your own songs. \
Yeh I know the ideal thing would be to not show the remove button, but that \
requires too much effort, I am too lazy, this works!');
        }
    });
});

// Send server stats
setInterval(function() {
    websock.sockets.in('users').emit('server stats', {
        totalConnectedUsers: countTotalUsers(),
        totalSongs: medialist.list.length
    });
}, 2000);

playlist.onCurrentSongComplete = function(){
    websock.sockets.in('users').emit('playlist updated', playlist.list);
};

function countTotalUsers() {
    var count = 0;
    var users = websock.sockets.in('users').manager.connected;
    
    for (var u in users) {
        count++;
    }
    
    return count;
}

console.log('Server started on port: ' + PORT);

