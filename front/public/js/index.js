let gameHasStarted = false;
var board = null;
var game = new Chess();
var $status = $('#status');
var $pgn = $('#pgn');
let gameOver = false;

function onDragStart(source, piece, position, orientation) {
    if (game.game_over() || !gameHasStarted || gameOver) return false;

    if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
        return false;
    }

    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

async function onDrop(source, target) {
    let theMove = {
        from: source,
        to: target,
        promotion: 'q'
    };

    var move = game.move(theMove);

    if (move === null) return 'snapback';

    try {
        socket.emit('move', theMove); // No need to await here unless the server is returning something
        updateStatus();
    } catch (error) {
        console.error('Error emitting move:', error);
    }
}

socket.on('newMove', function(move) {
    try {
        game.move(move);
        board.position(game.fen());
        updateStatus();
    } catch (error) {
        console.error('Error processing new move:', error);
    }
});

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';

    let moveColor = game.turn() === 'b' ? 'Black' : 'White';

    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    } else if (game.in_draw()) {
        status = 'Game over, drawn position';
    } else if (gameOver) {
        status = 'Opponent disconnected, you win!';
    } else if (!gameHasStarted) {
        status = 'Waiting for black to join';
    } else {
        status = moveColor + ' to move';
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check';
        }
    }

    $status.html(status);
    $pgn.html(game.pgn());
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png'
};

board = Chessboard('myBoard', config);

if (playerColor === 'black') {
    board.flip();
}

updateStatus();

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code')) {
    socket.emit('joinGame', {
        code: urlParams.get('code')
    });
}

socket.on('startGame', function() {
    gameHasStarted = true;
    updateStatus();
});

socket.on('gameOverDisconnect', function() {
    gameOver = true;
    updateStatus();
});

socket.on('waitingForOpponent', function() {
    $status.html('Waiting for an opponent...');
});

socket.on('invalidCode', function(message) {
    alert(message);
});
