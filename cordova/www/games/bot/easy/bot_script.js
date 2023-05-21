import {
    colorMessage,
    checkWin,
    printIllegalMove,
    removeIllegalMove,
    toTab,
    loadGame,
    saveGame,
    findTokenReturned,
    notLoggedRedirection
} from "../../gameManagement.js"
import {ioAddress} from "../../dataManager.js";
import {winVibration, loseVibration} from "../../../plugins/vibration.js";

/**
 *
 * @fileoverview This file contains the script for the connect 4 IA RANDOM.
 *
 * @author      Weel Ben Aissa
 * @author      Ayoub Imami
 * @author      Mourad Karrakchou
 *
* FOR THE DOC OF THIS FILE SEE THE FILE bot_script.js IN THE FOLDER MEDIUM
 */

// If not logged in, redirected to the login page
notLoggedRedirection();
let ambient = new Audio("../../../audio/music.wav");
ambient.loop = true;
ambient.play();
var roomName;
let gameOver = false;
document.addEventListener('DOMContentLoaded', init);
var socket = io(ioAddress);
let counter = 0;



async function init() {
    // If not logged in, redirected to the login page
    await notLoggedRedirection();

    window.addEventListener("load", function () {
        colorMessage(counter);
        document.getElementById("player").innerText = "Your turn to play";
    })
    document.getElementById("grid").addEventListener("click", function (event) {
        play(event)
    });
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id') != null) {
        roomName = findTokenReturned() + urlParams.get('id');
        loadGame();
    } else {
        roomName = findTokenReturned() + Math.floor(Math.random() * 100000000000000000);
    }
    socket.on('connect', function () {
        socket.emit('joinRoom', roomName);
    });
    socket.on('updateRoom', function (id) {
        console.log(id);
        console.log(roomName);
    });
    socket.on('doMove', function (pos) {
        if (!isMoveIllegal(JSON.parse(pos))) {
            startplay(JSON.parse(pos));
            counter++;
        }
    })
}

function play(event) {
    let id = event.target.id;
    let tab = id.split(" ");
    if(!isMoveIllegal(tab)) {
        startplay(tab,false);
        if (!gameOver) {
            socket.emit('play', JSON.stringify({
                id: roomName,
                board: toTab()
            }));
            counter++;
        }
    }
}

function startplay(tab){
    removeIllegalMove();

    if (gameOver) return;
    let color = 'red';
    if (counter % 2 === 0) color = 'yellow';

    let column = tab[0];
    let line = 5;

    let id = column + " " + line;

    if (document.getElementById(id).style.backgroundColor !== "")
        return printIllegalMove();

    while (line >=0 && document.getElementById(id).style.backgroundColor === "") {
        line--;
        id = column + " " + line;
    }
    console.log(counter);

    line++;
    id = column + " " + line;
    document.getElementById(id).style.backgroundColor = color;
    if (counter === 41) {
        console.log("Draw!");
        document.getElementById("message").innerText = "Draw!";
        document.getElementById("reset-button").style.display = "block";
        document.getElementById("reset-button").addEventListener("click", resetGame);
        gameOver = true;
    }
    if (checkWin() === true) {
        console.log(color + " player wins!");
        if (color === 'yellow') {
            winVibration();
            document.getElementById("message").innerText = "You won!";
        }
        else {
            loseVibration();
            document.getElementById("message").innerText = color + " player wins!";
        }
        document.getElementById("saveButton").style.display = "none";
        document.getElementById("saveButton").style.pointerEvents = "none";
        document.getElementById("reset-button").style.display = "block";
        document.getElementById("reset-button").addEventListener("click", function (){
            resetGame();
            document.getElementById("saveButton").style.display = "block";
            document.getElementById("saveButton").style.pointerEvents = "auto";

        });
        gameOver = true;
    }
}

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

function isMoveIllegal(tab){
    let column = tab[0];
    let line = 5;

    let id = column + " " + line;
    if (document.getElementById(id).style.backgroundColor !== "") {
        printIllegalMove();
        return true;
    }
    return false;
}
