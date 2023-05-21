import {
    colorMessage,
    checkWin,
    getCount,
    printIllegalMove,
    removeIllegalMove,
    loadGame,
    saveGame,
    isMoveIllegal,
    notLoggedRedirection
} from "../gameManagement.js"

import {winVibration} from "../../plugins/vibration.js";

let counter = 0;
let gameOver = false;
const mapColor = new Map();
let ambient = new Audio("../../audio/music.wav");
ambient.loop = true;
ambient.play();
mapColor.set('Yellow','#cee86bcc');
mapColor.set('Red','#c92c2c9c');
document.addEventListener('DOMContentLoaded', init);
/**
 * This class manage the local game
 *
 */


document.getElementById("muteson").addEventListener("click",checkSound)
function checkSound(){
    if (ambient.volume === 0)
    {
        ambient.volume = 1;
        document.getElementById("sonUp").style.display="block";
        document.getElementById("sonDown").style.display="none";
    }
    else{
        ambient.volume = 0;
        document.getElementById("sonUp").style.display="none";
        document.getElementById("sonDown").style.display="block";
    }
}

window.addEventListener('load', async function () {
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('id') != null) await loadGame();
        counter = getCount();
        console.log(counter);
        colorMessage(counter);

    }
)

async function init() {
    // If not logged in, redirected to the login page
    await notLoggedRedirection();
    window.addEventListener("load", function () {
        colorMessage(counter);
    })
    document.getElementById("grid").addEventListener("click", play);
    document.getElementById("grid").addEventListener("click", function () {
        if (!gameOver) colorMessage(counter);
    });
    document.getElementById("sonDown").style.display="none";

}

function play(event){
    if (gameOver || isMoveIllegal(event)) return
    gameOver = !startPlay(event);
    counter++;
}

/**
 * return false if the game is finished and true is the person still plays
 * @param event
 * @returns {boolean|void}
 */
function startPlay(event) {
    removeIllegalMove();
    console.log(document.cookie.toString())
    let color = 'red';
    if (counter % 2 === 0) color = 'yellow';

    let id = event.target.id;
    let tab = id.split(" ");
    let column = tab[0];
    let line = 5;

    id = column + " " + line;



    while (line >=0 && document.getElementById(id).style.backgroundColor === "") {
        line--;
        id = column + " " + line;
    }

    line++;
    id = column + " " + line;
    console.log(id);
    document.getElementById(id).style.backgroundColor = color;
    if (counter === 41) {
        console.log("Draw!");
        document.getElementById("message").innerText = "Draw!";
        document.getElementById("reset-button").style.display = "block";
        document.getElementById("reset-button").addEventListener("click", resetGame);
        return false;
    }
    if (checkWin() === true) {
        winVibration();
        console.log(color + " player wins!");
        document.getElementById("message").innerText = color + " player wins!";
        document.getElementById("reset-button").style.display = "block";
        document.getElementById("reset-button").addEventListener("click", resetGame);
        return false;
    }


    return true;
}

/**
 * play again when the game is finished
 */

function resetGame() {
    gameOver = false;
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            let id = j + " " + i;
            document.getElementById(id).style.backgroundColor = "";
        }
    }
    counter = 0;
    document.getElementById("message").innerText = "";
    document.getElementById("reset-button").style.display = "none";
}
