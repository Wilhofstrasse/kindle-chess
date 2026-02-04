// Player Management Module
var PlayerManager = {
    STORAGE_KEY: 'kindle_chess_players',

    // Computer ELO based on thinking time
    COMPUTER_ELO: {
        '0.2': 800,
        '0.5': 1000,
        '1': 1200,
        '2': 1400,
        '4': 1500,
        '6': 1600,
        '8': 1700,
        '10': 1800
    },

    // Load players from localStorage
    loadPlayers: function() {
        var stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.log('Error loading players:', e);
                return [];
            }
        }
        return [];
    },

    // Save players to localStorage
    savePlayers: function(players) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(players));
    },

    // Add new player
    addPlayer: function(name) {
        if (!name || name.trim() === '') return null;

        var players = this.loadPlayers();

        // Check if player already exists
        for (var i = 0; i < players.length; i++) {
            if (players[i].name.toLowerCase() === name.toLowerCase()) {
                return null;
            }
        }

        var newPlayer = {
            name: name.trim(),
            elo: 1200,
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0
        };

        players.push(newPlayer);
        this.savePlayers(players);
        return newPlayer;
    },

    // Get player by name
    getPlayer: function(name) {
        var players = this.loadPlayers();
        for (var i = 0; i < players.length; i++) {
            if (players[i].name === name) {
                return players[i];
            }
        }
        return null;
    },

    // Update player data
    updatePlayer: function(player) {
        var players = this.loadPlayers();
        for (var i = 0; i < players.length; i++) {
            if (players[i].name === player.name) {
                players[i] = player;
                this.savePlayers(players);
                return;
            }
        }
    },

    // Calculate new ELO rating
    calculateNewELO: function(playerELO, opponentELO, score) {
        // score: 1 = win, 0.5 = draw, 0 = loss
        // K-factor 32 for casual play
        var expected = 1 / (1 + Math.pow(10, (opponentELO - playerELO) / 400));
        return Math.round(playerELO + 32 * (score - expected));
    },

    // Record game result and update ELOs
    recordGame: function(whitePlayer, blackPlayer, result) {
        // result: "1-0" (white wins), "0-1" (black wins), "1/2-1/2" (draw)
        var whiteScore, blackScore;

        if (result === "1-0") {
            whiteScore = 1;
            blackScore = 0;
        } else if (result === "0-1") {
            whiteScore = 0;
            blackScore = 1;
        } else {
            whiteScore = 0.5;
            blackScore = 0.5;
        }

        // Update white player
        if (whitePlayer && whitePlayer.name !== 'Computer') {
            var whiteELO = whitePlayer.elo;
            var blackELO = blackPlayer ? blackPlayer.elo : 1200;

            whitePlayer.elo = this.calculateNewELO(whiteELO, blackELO, whiteScore);
            whitePlayer.gamesPlayed++;

            if (whiteScore === 1) whitePlayer.wins++;
            else if (whiteScore === 0) whitePlayer.losses++;
            else whitePlayer.draws++;

            this.updatePlayer(whitePlayer);
        }

        // Update black player
        if (blackPlayer && blackPlayer.name !== 'Computer') {
            var blackELO = blackPlayer.elo;
            var whiteELO = whitePlayer ? whitePlayer.elo : 1200;

            blackPlayer.elo = this.calculateNewELO(blackELO, whiteELO, blackScore);
            blackPlayer.gamesPlayed++;

            if (blackScore === 1) blackPlayer.wins++;
            else if (blackScore === 0) blackPlayer.losses++;
            else blackPlayer.draws++;

            this.updatePlayer(blackPlayer);
        }
    },

    // Get computer player object for given thinking time
    getComputerPlayer: function(thinkTime) {
        var elo = this.COMPUTER_ELO[thinkTime] || 1200;
        return {
            name: 'Computer',
            elo: elo,
            isComputer: true
        };
    },

    // Delete player
    deletePlayer: function(name) {
        var players = this.loadPlayers();
        players = players.filter(function(p) { return p.name !== name; });
        this.savePlayers(players);
    }
};

// === GAME AUTO-SAVE ===
var GameSaver = {
    SAVE_KEY: 'kindle_chess_game',

    saveGame: function() {
        try {
            var state = {
                fen: BoardToFen(),
                hisPly: brd_hisPly,
                playerSide: GameController.PlayerSide,
                boardFlipped: GameController.BoardFlipped,
                twoPlayerMode: GameController.TwoPlayerMode,
                gameOver: GameController.GameOver,
                whitePlayer: GameController.WhitePlayer,
                blackPlayer: GameController.BlackPlayer,
                hintsOn: $("#HintsToggle").is(":checked"),
                thinkTime: $("#ThinkTimeChoice").val(),
                gameMode: $("#GameMode").val(),
                timestamp: Date.now()
            };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(state));
        } catch(e) {
            console.log('Error saving game:', e);
        }
    },

    loadGame: function() {
        try {
            var saved = localStorage.getItem(this.SAVE_KEY);
            if (!saved) return null;
            return JSON.parse(saved);
        } catch(e) {
            console.log('Error loading game:', e);
            return null;
        }
    },

    clearSave: function() {
        localStorage.removeItem(this.SAVE_KEY);
    },

    hasSavedGame: function() {
        var saved = this.loadGame();
        return saved !== null && !saved.gameOver;
    }
};
