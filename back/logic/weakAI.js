/**
 * Weak AI that choose a column randomly.
 */


/**
 * Get a random column (integer between 0 and 6).
 * @param gameState
 * @returns {(number|number)[]}
 */
function computeMove(gameState) {
    while(true) {
        let i = Math.floor(Math.random() * 7);
        for (let j = 0; j <= 5; j++) {
            console.log([i,j])
            if (gameState.board[i][j] === 0) {
                return [i, j];
            }
        }
    }
}

exports.computeMove = computeMove;
