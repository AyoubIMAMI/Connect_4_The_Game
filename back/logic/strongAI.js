const gameManager = require("../queryManagers/game/gameManager.js");

/**
 * Strong AI that choose a column using a Monte Carlo like algorithm.
 */

let playFirst = false;
let turn = 0;
let board;
let start;
let currentPlayerSimulation;
let moveSimulation;
let legalMovesInMC;
let moveWinsInMC;
let simulationsInMC;

// Initialize the board
resetBoard();

/**
 * Set up the board and the move.
 * @param aiPlays
 * @returns {boolean}
 */
function setup(aiPlays) {
    console.log("THIS IS THE BOARD" + aiPlays.board);
    console.log("aiPlays: " + aiPlays);
    if (aiPlays.reloadingGame) {
        board = aiPlays.tab
        console.log(board);
    } else {
        console.log("PAS RELOAD")
        resetBoard();
    }
    console.log(aiPlays.player)
    turn = aiPlays.player
    playFirst = false;
    console.log(turn)
    console.log(turn === 1)
    if (turn === 1)
        playFirst = true;
    return true;
}

/**
 * Reset the board.
 */
function resetBoard() {
    board = gameManager.createBoard();
}

/**
 * Finding the next move.
 * @param lastMove
 * @returns {Promise<unknown>}
 */
function nextMove(lastMove) {
    console.log("THIS IS THE LAST MOVE")
    console.log(lastMove);
    moveWinsInMC = Array(7).fill(0);
    start = performance.now();
    if (!playFirst)
        board[lastMove[0]][lastMove[1]] = -1;
    playFirst = false;

    return monteCarlo(board, 1, start, 1000);
}

/**
 * Test the next move.
 * @param lastMove
 * @returns {Promise<*>}
 * @constructor
 */
async function TestNextMove(lastMove) {
    return (nextMove(lastMove));
}

/**
 * Simulates a game on the board starting with the given player.
 * @param board
 * @param player
 * @returns {number|number}
 */
function simulateGame(board, player) {
    currentPlayerSimulation = player;
    while (true) {
        moveSimulation = gameManager.getRandomMove(board);
        board = gameManager.makeMove(board, currentPlayerSimulation, moveSimulation);
        if (gameManager.isWin(board, gameManager.findRow(board, moveSimulation) - 1, moveSimulation)) {
            return currentPlayerSimulation;
        }
        if (gameManager.isTie(board)) {
            return 0;
        }
        currentPlayerSimulation = currentPlayerSimulation === 1 ? -1 : 1;
    }
}

/**
 * Runs the Monte Carlo algorithm on the board for the given player.
 * Simulates as many games as possible in 100ms and returns the best move based on the simulation results.
 * @param board
 * @param player
 * @param start
 * @param time
 * @returns {Promise<unknown>}
 */
function monteCarlo(board, player, start, time) {
    return new Promise(function (resolve) {
        legalMovesInMC = gameManager.getLegalMoves(board);
        simulationsInMC = 0;
        let finalMove;
        let notFinished = true;
        let counter = 0;
        let iteration = 0;
        while (notFinished) {
            for (const move of legalMovesInMC) {
                iteration++;
                const newBoard = gameManager.makeMove(board, player, move);
                let result;
                if (gameManager.isWin(newBoard, gameManager.findRow(newBoard, move) - 1, move)) {
                    result = 1;
                    counter++;
                } else if (gameManager.isTie(newBoard)) {
                    result = 0.5;
                } else {
                    result = simulateGame(newBoard, -1);
                }
                moveWinsInMC[move] += result === player ? 1 : result === 0 ? 0.5 : 0;
                simulationsInMC++;
                if (performance.now() - start >= time) {
                    console.log(moveWinsInMC);
                    let c = moveWinsInMC.indexOf(Math.max(...moveWinsInMC));
                    if (Math.max(...moveWinsInMC) === 0) {
                        c = legalMovesInMC[0];
                    }
                    let r = gameManager.findRow(board, c);
                    board[c][r] = 1;
                    finalMove = [c, r];
                    notFinished = false;
                    break;
                } // stop if time limit reached
            }
        }
        setTimeout(resolve, 0, finalMove);
    });
}

exports.setup = setup;
exports.nextMove = nextMove;
exports.TestNextMove = TestNextMove;
