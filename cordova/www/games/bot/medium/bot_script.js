import {
    checkWin,
    printIllegalMove,
    removeIllegalMove,
    toTab,
    loadGame,
    saveGame,
    findTokenReturned,
    getCount,
    retrieveGameState, notLoggedRedirection
} from "../../gameManagement.js"
import {address, ioAddress} from "../../dataManager.js";
import {winVibration, loseVibration} from "../../../plugins/vibration.js";
/**
 *
 * @fileoverview This file contains the script for the connect 4 smart IA.
 *
 * @author      Weel Ben Aissa
 * @author      Ayoub Imami
 * @author      Mourad Karrakchou
 *
 */
// If not logged in, redirected to the login page
notLoggedRedirection();
var roomName;
let gameOver = false;
document.addEventListener('DOMContentLoaded', init);
var socket = io(ioAddress);
let counter = 0;
export let itsMyTurn;
const mapColor = new Map();
let startInversered=false;
let ambient = new Audio("../../../audio/music.wav");
ambient.loop = true;
ambient.play();

mapColor.set('Yellow','#cee86bcc');
mapColor.set('Red','#c92c2c9c');

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

/**
 * This function is used to change the color of the message in a game
 * @param counter pair or odd
 *
 */
function colorMessage(counter) {
    let color = 'Red';
    if (counter % 2 === 0) color = 'Yellow';
    document.getElementById("body").style.backgroundColor = mapColor.get(color);
    if (itsMyTurn) document.getElementById("player").innerText = "Your turn to play";
    else document.getElementById("player").innerText = color + " turn to play";
}

async function init() {
    // If not logged in, redirected to the login page
    await notLoggedRedirection();
    roomName = findTokenReturned() + Math.floor(Math.random() * 100000000000000000);
    window.addEventListener("load", function () {
        colorMessage(counter);
    })
    document.getElementById("grid").addEventListener("click", function (event) {
        play(event)
    });
    var urlParams = new URLSearchParams(window.location.search);
    socket.on('connect', function () {
        socket.emit('joinRoom', roomName);
    });
    socket.on('updateRoom', function (id) {
        console.log(id);
        console.log(roomName);
    });
    socket.on('doMove', function (pos) {
        startplay(JSON.parse(pos));
        counter++;
        if (!gameOver) colorMessage(counter);
    })
    if (urlParams.get('id') != null) {
        loadGame();
        loadFirstPlayer();
    } else {
        if (Math.round(Math.random()) === 0) {
            startInversered = true;
            socket.emit('initAdv', {
                reloadingGame: false,
                id: roomName,
                player: 1
            });
            socket.emit('playAdv', JSON.stringify({
                id: roomName,
                pos: undefined
            }));
            itsMyTurn = false;
            if (!gameOver) colorMessage(counter);
        } else {
            socket.emit('initAdv', {
                reloadingGame: false,
                id: roomName,
                player: 2
            });
            itsMyTurn = true;
            if (!gameOver) colorMessage(counter);
        }
    }
    document.getElementById("sonDown").style.display="none";
}

/**
 * This function is used to load the first player
 *
 * @param event
 */
function play(event) {
    let id = event.target.id;
    let tab = id.split(" ");
    if(!isMoveIllegal(tab)) {
        let pos=startplay(tab,false);
        if (!gameOver) {
            if (pos!=null) socket.emit('playAdv', JSON.stringify({
                                id: roomName,
                                pos: pos
                            }));
            counter++;
            colorMessage(counter);
        }
    }
}

/**
 * This function is used to load the first player and initialize the game
 * @param tab the gameBoard
 * @returns {(*|number)[]}
 */
function startplay(tab){
    itsMyTurn=!itsMyTurn;
    removeIllegalMove();

    if (gameOver) return;
    let color = 'red';
    if (counter % 2 === 0) color = 'yellow';

    let column = tab[0];
    let line = 5;

    let id = column + " " + line;

    if (document.getElementById(id).style.backgroundColor !== "")
    {printIllegalMove();
        return}

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
        if (!itsMyTurn) {
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
    return ([column,line]);

}

/**
 *Play again after a game is over
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
    socket.emit('initAdv',{
        reloadingGame: false,
        id:roomName,
        player:2});
}

/**
 * This function is used to check if the move is legal or if its our turn
 * @param tab the gameBoard
 * @returns {boolean} true if the move is illegal
 */
function isMoveIllegal(tab){
    let column = tab[0];
    let line = 5;

    let id = column + " " + line;
    if (document.getElementById(id).style.backgroundColor !== ""|| !itsMyTurn) {
        printIllegalMove();
        return true;
    }
    return false;
}

/**
 * the first player to play when we retrieve a saved game
 * @returns {Promise<void>}
 */
async function loadFirstPlayer() {
    let token = findTokenReturned();
    var urlParams = new URLSearchParams(window.location.search);

    const values = {
        token: token,
        id: urlParams.get('id'),
    };
    console.log(values);

    await fetch(address + '/api/game/retrieveGameWithId', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
    })
        .then(response => response.json())
        .then(data => {
            counter=getCount();
            socket.emit('initAdv',{
                id:roomName,
                player:2,
                startInversered:data.startInversered,
                reloadingGame: true,
                tab:data.tab});
            itsMyTurn=true;
            if (!gameOver) colorMessage(counter);
        })
        .catch(error => {
            console.error(error);
        });
}

