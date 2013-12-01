module.exports = {
    getPlayer: function (playerName) {
        playerName = (playerName || 'mplayer').toLowerCase();
        return require('./' + playerName + '.js');
    },

    load: function (playerName, args) {
        console.log(arguments);
        var Player = this.getPlayer(playerName);
        return new Player(args);
    }
};