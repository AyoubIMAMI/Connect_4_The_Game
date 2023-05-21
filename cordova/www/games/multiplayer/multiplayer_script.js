import {
    checkWin,
    removeIllegalMove,
    loadGame,
    printIllegalMove, notLoggedRedirection
} from "../gameManagement.js"
import {ioAddress} from "../dataManager.js";
import {winVibration, loseVibration, popupVibration, timerVibration, errorVibration} from "../../plugins/vibration.js";

/**
 * this class manage the multiplayer game with the timer, elo calculation and the surrender button
 * @author Weel BEN AISSA
 * @author Mourad KARRAKCHOU
 * @author Ayoub IMAMI
 * @type {number}
 */




let ambient = new Audio("../../audio/music.wav");
ambient.loop = true;
ambient.play();

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

let counter = 0;
let gameOver = false;
let itsMyTurn;
var socket = io(ioAddress);
let playfirst;
var player1elo = 0;
var player2elo = 0;
const home = document.getElementById("home");
const surrenderBtn = document.getElementById("surrenderButton");
const noSurrenderKeepPlayingBtn = document.getElementById("noSurrenderKeepPlaying");
const surrenderBackToHomeBtn = document.getElementById("SurrenderBackToHome");
const allElements = document.querySelectorAll("*:not(#noSurrenderKeepPlaying):not(#SurrenderBackToHome)");


//for disable the page and make only the surrender button clickable
surrenderBtn.addEventListener("click", function() {
    allElements.forEach(function (element) {
        element.style.pointerEvents = "none";
    });
    surrenderBackToHomeBtn.style.pointerEvents = "auto";
    noSurrenderKeepPlayingBtn.style.pointerEvents = "auto";
    surrender();
});

noSurrenderKeepPlayingBtn.addEventListener("click", function() {
    // Réactiver tous les éléments de la page
    allElements.forEach(function (element) {
        element.style.pointerEvents = "auto";
    });
});
//to re set the page clickable
surrenderBackToHomeBtn.addEventListener("click", function() {
    // Réactiver tous les éléments de la page
    allElements.forEach(function (element) {
        element.style.pointerEvents = "auto";
    });
});

home.addEventListener("click", function() {
    window.location.href = '../../home/home.html';
});


const mapColor = new Map();
mapColor.set('Yellow','#cee86bcc');
mapColor.set('Red','#c92c2c9c');

socket.on('firstPlayerInit', (playersData) => {
    playfirst=true;
    colorMessage(counter);
    if (playersData != null) {
        player1elo = playersData.yourElo;
        player2elo = playersData.opponentElo;
        document.getElementById("opponentElo").innerText = "Opponent elo: " + playersData.opponentElo;
        document.getElementById("playerElo").innerText = "Your elo: " + playersData.yourElo;
    }
});
socket.on('secondPlayerInit', (playersData) => {
    playfirst=false;
    colorMessage(counter);
    if (playersData != null) {
        document.getElementById("opponentElo").innerText = "Opponent elo: " + playersData.opponentElo;
        document.getElementById("playerElo").innerText = "Your elo: " + playersData.yourElo;
    }
});
//emit to send when the player win or lose
socket.on('win', (data) => {
    gameOver = true;
    winVibration();
if(data != null) {
    document.getElementById("message").innerText = " You won " + Math.abs(data) + " elo points! ";
}else{
    document.getElementById("message").innerText = " You won ! ";
}
home.style.pointer = "cursor";
home.style.display = "flex"
surrenderBtn.replaceWith(home);
});
socket.on('lose', (data) => {
    gameOver = true;
    loseVibration();
    console.log("FF");
    if(data != null) {
        document.getElementById("message").innerText = " You lost " + Math.abs(data) + " elo points!";
    }else{
        document.getElementById("message").innerText = " You lost ! "
    }
    home.style.pointer = "cursor";
    home.style.display = "flex";
    surrenderBtn.replaceWith(home);
});
socket.on('tie', () => {
    gameOver = true;
    console.log("Draw!");
    document.getElementById("message").innerText = "Draw!";
    home.style.pointer = "cursor";
    home.style.display = "flex"
    surrenderBtn.replaceWith(home);
});
/**
 * the socket for the chat in game and the mute button for not get spammed
 */
socket.on('message', (req) => {
    if (!isMuted) {
        writeInChat(req.username+": " + req.message);
    }
})

socket.on('timerReset', () => {
    resetTimer();
});

socket.on('stopTimer', () => {
    clearInterval(intervalId);
})

socket.on('updateColor', () => {
    colorMessage(counter);
})

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('load', function () {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id')!=null) loadGame();
    console.log({room:findInCookie("matchID="),token:findInCookie("token=")});
}
)

async function init() {
    // If not logged in, redirected to the login page
    await notLoggedRedirection();
    // Timer
    intervalId = setInterval(timerCount, 1000);

    socket.emit('getPlayersNameToDisplay', null);
    socket.on('playersNameToDisplay', (names) => {
        document.getElementById("firstPlayerName").innerText = names.firstPlayerName;
        document.getElementById("secondPlayerName").innerText = names.secondPlayerName;
    });

    window.addEventListener("load", function () {
        colorMessage(counter);
    })
    socket.emit('initMulti', JSON.stringify({matchID: findInCookie("matchID="), token: findInCookie("token=")}));
    document.getElementById("grid").addEventListener("click", play);
    document.getElementById("surrenderButton").addEventListener("click", function () {
        surrender()
    });
    document.getElementById("gameChatDisplay").addEventListener("click",function(){
        if(document.getElementById("chat-container-bis").style.display!=="flex")
        {
            document.getElementById("chat-container-bis").style.display="flex";
            document.getElementById("playerElo").style.display="none";
            document.getElementById("opponentElo").style.display="none";
        }

        else{
            document.getElementById("chat-container-bis").style.display="none";
            document.getElementById("playerElo").style.display="block";
            document.getElementById("opponentElo").style.display="block";
        }
    })
    socket.on('doMoveMulti', function (pos) {
        startplay(JSON.parse(pos));
        counter++;
    });
    document.getElementById("sonDown").style.display="none";


}

/**
 * Function to surrender and emit the sockets win or lose to the server
 */
function surrender() {
    popupVibration();
    document.getElementById("surrenderedGameMessage").style.display = "block";
    document.getElementById("noSurrenderKeepPlaying").addEventListener('click', function () {errorVibration(); document.getElementById("surrenderedGameMessage").style.display = "none";});
    document.getElementById("SurrenderBackToHome").addEventListener('click', function () {
        socket.emit('surrender', {
            matchID: findInCookie("matchID="),
            token: findInCookie("token=")
        });
        document.getElementById("surrenderedGameMessage").style.display = "none";
    });
}

const muteButton = document.getElementById("mute-button");
let isMuted = false;

muteButton.addEventListener("click", () => {
    isMuted = !isMuted;
    if (isMuted) {
        // Mettre la logique pour couper le son de votre chat ici.
        muteButton.innerText = "Unmute";
    } else {
        // Mettre la logique pour réactiver le son de votre chat ici.
        muteButton.innerText = "Mute";
    }
});

function play(event) {
    let id = event.target.id;
    let tab = id.split(" ");
    if(!isMoveIllegal(tab)) {
        let pos=startplay(tab,false);
        if (pos != null)
            socket.emit('playMulti', JSON.stringify(
                {matchID: findInCookie("matchID="), token: findInCookie("token="), pos: pos}
            ));
        counter++;
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

    return ([column,line]);
}

//unused here
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

    const chatForm = document.querySelector('#chat-form');
    const chatInput = document.querySelector('#chat-input');
    const chatMessages = document.querySelector('#chat-messages-bis');

// Ajouter un événement pour envoyer un message
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message !== '') {
            appendMessage(message, 'me');
            // Envoyer le message au serveur (si nécessaire)
            chatInput.value = '';
        }
    });


    /**
     * function to append a message to the chatbox
     * @param message the message to append
     * @param className the class of the message
     */
    function appendMessage(message, className) {
        const newMessage = document.createElement('div');
        newMessage.innerText = message;
        newMessage.classList.add('message', className);
        chatMessages.appendChild(newMessage);
    }
}




//in format : "token="
function findInCookie(str){
    let cookies = document.cookie.split(';');
    console.log(cookies);
    for (let i = 0; i < cookies.length; i++) {
        if (cookies[i].trim().startsWith(str)) {
            return(cookies[i].trim().substring(str.length, cookies[i].trim().length));
        }
    }
}
function colorMessage(counter) {
    if (!gameOver) {
        let color = 'Red';
        if (counter % 2 === 0) {
            color = 'Yellow';
        }

        let firstPlayerTurn = document.getElementById("firstPlayerName").innerText;
        let secondPlayerTurn = document.getElementById("secondPlayerName").innerText;

        document.getElementById("body").style.backgroundColor = mapColor.get(color);
        let message;
        if (playfirst === (counter % 2 === 0)) {
            document.getElementById("player").innerText = "Your turn to play";
            itsMyTurn = true;
        } else {
            if (color === 'Yellow') message = firstPlayerTurn + " turns to play";
            else message = secondPlayerTurn + " turns to play";
            document.getElementById("player").innerText = message;
            itsMyTurn = false;
        }
    }
}
// récupère le bouton "salut !" et ajoute un événement "click"
document.getElementById("btn-salut").addEventListener("click", function() {
    writeInChat("Me: Hello !");
    socket.emit('chat',JSON.stringify({matchID:findInCookie("matchID="),token:findInCookie("token="),chat:"Hello !"}));
});
document.getElementById("btn-pret").addEventListener("click", function() {
    writeInChat("Me: I'm ready !");
    socket.emit('chat',JSON.stringify({matchID:findInCookie("matchID="),token:findInCookie("token="),chat:"I'm ready !"}));
});
document.getElementById("btn-wp").addEventListener("click", function() {
    writeInChat("Me: Well Played !");

    socket.emit('chat',JSON.stringify({matchID:findInCookie("matchID="),token:findInCookie("token="),chat:"Well Played !"}));
});
document.getElementById("btn-merci").addEventListener("click", function() {
    writeInChat("Me: Thank You !");
    socket.emit('chat',JSON.stringify({matchID:findInCookie("matchID="),token:findInCookie("token="),chat:"Thank You!"}));
});

/**
 * function to write a message in the chatbox with the good format and style
 * @param str
 */
function writeInChat(str){
        var chatbox = document.getElementById("chat-messages-bis");
        // crée un nouvel élément div
        var message = document.createElement("div");
        // ajoute la classe "user-message" à l'élément pour le style
        message.classList.add("user-message");
        // ajoute le message "salut !" dans le texte de l'élément
        message.innerText = str;
        // ajoute l'élément à la zone de chat
        chatbox.appendChild(message);
        // scroll vers le bas de la zone de chat
        chatbox.scrollTop = chatbox.scrollHeight;

}

function isMoveIllegal(tab){
    let column = tab[0];
    let line = 5;

    let id = column + " " + line;
    if (document.getElementById(id).style.backgroundColor !== "" || !itsMyTurn) {
        printIllegalMove();
        return true;
    }
    return false;
}


// ------------------------------ Timer ------------------------------
let intervalId;
let timeLeft = 30; // 30 seconds to play
let timer = document.getElementById('timer');

/**
 * function to start the timer and to update the timer when a player plays
 */
function timerCount() {
    if (timeLeft < 0) {
        clearInterval(intervalId); // Stop the timer
        socket.emit('timeOver', {
            matchID: findInCookie("matchID="),
            token: findInCookie("token="),
            itsMyTurn: itsMyTurn
        });
    } else {
        if (timeLeft < 10) {timerVibration(); timer.style.color = 'red'; timer.innerHTML = "00:0" + timeLeft;}
        else timer.innerHTML = "00:" + timeLeft;
        timeLeft--;
    }
}

//reset to 30 seconds
function resetTimer() {
    timeLeft = 30;
    clearInterval(intervalId)
    intervalId = setInterval(timerCount, 1000);
}

