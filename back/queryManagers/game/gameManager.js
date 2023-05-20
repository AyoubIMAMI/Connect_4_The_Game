const mongoDBConnection = require("../databaseManager.js");

/**
 * Returns an array of legal moves on the board.
 * @param board
 * @returns {*[]}
 */
function getLegalMoves(board) {
    let legalMovesToFind = [];
    for (let col = 0; col < 7; col++) {
        if (board[col][5] === 0) {
            legalMovesToFind.push(col);
        }
    }
    return legalMovesToFind;
}

/**
 * Returns a random legal move on the board.
 * @param board
 * @returns {*}
 */
function getRandomMove(board) {
    let legalMovesToGet = getLegalMoves(board);
    return legalMovesToGet[Math.floor(Math.random() * legalMovesToGet.length)];
}

/**
 * Find the upper available row of a column
 * @param board
 * @param column
 * @returns {number}
 */
function findRow(board, column) {
    let rowToFind = 5;
    while(board[column][rowToFind] === 0 && rowToFind > 0) {
        rowToFind--;
    }
    if(rowToFind === 0 && board[column][rowToFind] === 0){
        return rowToFind;
    }
    return rowToFind + 1;

}

/**
 * Returns a new board with the player's move made in the specified column.
 * @param board
 * @param player
 * @param column
 * @returns {*|null}
 */
function makeMove(board, player, column) {
    let newBoardAfterMove = board.map(col => col.slice()); // Copy the board
    for (let row = 0; row < 6; row++) {
        if (newBoardAfterMove[column][row] === 0) {
            newBoardAfterMove[column][row] = player;
            return newBoardAfterMove;
        }
    }
    return null; // Column is full
}

/**
 * Returns true if the board is full and there is no winner, false otherwise.
 * @param board
 * @returns {boolean}
 */
function isTie(board) {
    for (let col = 0; col < 7; col++) {
        if (board[col][5] === 0) {
            return false;
        }
    }
    return true;
}

/**
 * Check if there is a winner from a position.
 * @param board
 * @param line
 * @param column
 * @returns {boolean}
 */
function isWin(board, line,column) {
    const player = board[column][line];
    let count = 1;
    let j = line;
    while (j > 0 && board[column][j - 1] === player) {
        j--;
        count++;
    }
    j = line;
    while (j < board[column].length - 1 && board[column][j + 1] === player) {
        j++;
        count++;
    }
    if (count >= 4) {
        return true;
    }

    // Check horizontal
    count = 1;
    let i = column;
    while (i > 0 && board[i - 1][line] === player) {
        i--;
        count++;
    }
    i = column;
    while (i < board.length - 1 && board[i + 1][line] === player) {
        i++;
        count++;
    }
    if (count >= 4) {
        return true;
    }

    // Check diagonal (top-left to bottom-right)
    count = 1;
    i = column;
    j = line;
    while (i > 0 && j > 0 && board[i - 1][j - 1] === player) {
        i--;
        j--;
        count++;
    }
    i = column;
    j = line;
    while (i < board.length - 1 && j < board[column].length - 1 && board[i + 1][j + 1] === player) {
        i++;
        j++;
        count++;
    }
    if (count >= 4) {
        return true;
    }

    // Check diagonal (bottom-left to top-right)
    count = 1;
    i = column;
    j = line;
    while (i > 0 && j < board[column].length - 1 && board[i - 1][j + 1] === player) {
        i--;
        j++;
        count++;
    }
    i = column;
    j = line;
    while (i < board.length - 1 && j > 0 && board[i + 1][j - 1] === player) {
        i++;
        j--;
        count++;
    }

    return count >= 4;
}

/**
 * Calculate the new Elo rating of a player
 * @param playerElo the current Elo rating of the player
 * @param opponentElo the current Elo rating of the opponent
 * @param didWin whether the player won or lost
 * @returns {number}
 */
function calculateNewElo(playerElo, opponentElo, didWin) {
    const kFactor = 45; // Elo rating system constant
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400)); // Calculate expected score based on Elo ratings
    const actualScore = didWin ? 1 : 0; // Determine actual score based on whether the player won or lost

    const newElo = playerElo + kFactor * (actualScore - expectedScore); // Calculate new Elo rating using Elo rating system formula

    return Math.round(newElo); // Round new Elo rating to the nearest whole number
}

function createBoard() {
    return [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
    ];
}

/**
 * Check if a move is valid
 * @param moveToCheck the move to check
 * @returns {{winner: number, state: string}|{winner: (number|*), state: string}|{winner: string, state: string}}
 */
function checkMove(moveToCheck) {
    let board = moveToCheck.board
    let column = parseInt(moveToCheck.j);
    let line = parseInt(moveToCheck.i);
    console.log("colonne "+ column);
    console.log("line "+ line);

    const player = board[column][line];
    let count = 1;
    let j = line;
    while (j > 0 && board[column][j - 1] === player) {
        j--;
        count++;
    }
    j = line;
    while (j < board[column].length - 1 && board[column][j + 1] === player) {
        j++;
        count++;
    }
    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    // Check horizontal
    count = 1;
    let i = column;
    while (i > 0 && board[i - 1][line] === player) {
        i--;
        count++;
    }
    i = column;
    while (i < board.length - 1 && board[i + 1][line] === player) {
        i++;
        count++;
        console.log("LE I "+i);
        console.log("LE board "+board[i+1] );
    }
    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    // Check diagonal (top-left to bottom-right)

    count = 1;
    i = column;
    j = line;
    while (i > 0 && j > 0 && board[i - 1][j - 1] === player) {
        i--;
        j--;
        count++;
    }
    i = column;
    j = line;
    while (i < board.length - 1 && j < board[column].length - 1 && board[i + 1][j + 1] === player) {
        i++;
        j++;
        count++;
    }
    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    // Check diagonal (bottom-left to top-right)
    count = 1;
    i = column;
    j = line;
    while (i > 0 && j < board[column].length - 1 && board[i - 1][j + 1] === player) {
        i--;
        j++;
        count++;
    }
    i = column;
    j = line;
    while (i < board.length - 1 && j > 0 && board[i + 1][j - 1] === player) {
        i++;
        j--;
        count++;
    }

    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    else if (checkDraw(board)) return {
        state: "over",
        winner: 0
    }

    return {
        state: "continue",
        winner: "None"
    }
}

/**
 * Check if a move is illegal
 * @param board
 * @param column
 * @param playerTurn
 * @returns {boolean}
 */
function checkIllegalMove(board, column, playerTurn) {
    if (isColumnFull(board, column)) return true;
    else if (hasPlayedTwice(board, playerTurn)) return true;
    return false;
}

function getRandomNumber(min, max) {
    // Calculate a random number between min and max, inclusive
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function updateElo(gameInfo, didPlayer1Win, didPlayer2Win) {
    let oldElo1 = gameInfo.player1.elo;
    let oldElo2 = gameInfo.player2.elo;
    let newElo1 = calculateNewElo(gameInfo.player1.elo, gameInfo.player2.elo, didPlayer1Win)
    let newElo2 = calculateNewElo(gameInfo.player2.elo, gameInfo.player1.elo, didPlayer2Win);

    let delta1 = oldElo1 - newElo1;
    let delta2 = oldElo2 - newElo2;

    await mongoDBConnection.addElo(gameInfo.player1.username, newElo1);
    await mongoDBConnection.addElo(gameInfo.player2.username, newElo2);

    return {delta1: delta1, delta2: delta2};
}

exports.getLegalMoves = getLegalMoves;
exports.getRandomMove = getRandomMove;
exports.findRow = findRow;
exports.makeMove = makeMove;
exports.isTie = isTie;
exports.isWin = isWin;

exports.calculateNewElo = calculateNewElo;
exports.createBoard = createBoard;
exports.checkMove = checkMove;
exports.checkIllegalMove = checkIllegalMove;
exports.getRandomNumber = getRandomNumber;
exports.updateElo = updateElo;

/**
 * Check if the game is a draw
 * @param board
 * @returns {boolean}
 */
function checkDraw(board) {
    // Returns true if the board is full and there is no winner, false otherwise.
    for (let col = 0; col < 7; col++) {
        if (board[col][5] === 0) {
            return false;
        }
    }
    return true;
}

/**
 * Check if a column is full
 * @param board
 * @param column
 * @returns {boolean}
 */
function isColumnFull(board, column) {
    console.log("Illegal Move in Backend(full): " + (board[column][5] !== 0));
    return board[column][5] !== 0;
}

//player turn = 1 or -1
function hasPlayedTwice(board, playerTurn) {
    let sum = 0;
    for (let column = 0; column < 7; column++) {
        for (let line = 0; line < 6; line++) {
            sum += board[column][line];
        }
    }

    sum += playerTurn;
    console.log("Illegal Move in Backend(twice): " + (sum !== 0 || sum === 1));
    return !(sum === 0 || sum === 1);
}
