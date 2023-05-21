import {findToken, token, address, ioAddress} from "../games/dataManager.js";
import {findUsername, notLoggedRedirection} from "../games/gameManagement.js";
import {
    notificationVibration,
    popupVibration,
    muteVibrationUpdateCookie,
    isVibrationMuted
} from "../plugins/vibration.js";

/**
 * This class manage the home page
 *
 * He can choose various game modes and access to the rest of our website.
 */

const socket = io(ioAddress);
let saveIcon;


socket.on('matchFound', (matchID) => {
    document.cookie = "matchID=" + matchID + ";path=/";
    window.location.href = '../games/multiplayer/multiplayer.html';
});
socket.on('inQueue', () => {
    console.log("inQueue");
    document.getElementById("search").style.display = "block";
    document.getElementById("hidingEverything").style.display = "block";
});
socket.on('cancel', () => {
    document.getElementById("search").style.display = "none";
    document.getElementById("hidingEverything").style.display = "none";
});
let gameSaved;
let menu;
let littleMenu;
let cross;
document.addEventListener('DOMContentLoaded', async function () {
    // If not logged in, redirected to the login page
    await notLoggedRedirection();
    setTimeout(getAllGames, 200);
    document.getElementById("muteVibrationButton").addEventListener('click', muteVibration)
    document.getElementById("b").addEventListener('click', findGame);
    document.getElementById("cancel").addEventListener('click', cancelGame);
    document.getElementById("title").innerText = "Welcome to Connect4 " + findUsername() + "!";
    saveIcon = document.getElementById("saveIcon");
    menu = document.getElementById("menu");
    gameSaved = document.getElementById("gameSaved");
    littleMenu = document.getElementById("littleMenu");
    cross = document.getElementById("cross");
    saveIcon.addEventListener('click', function () {
        menu.style.display = "none";
        littleMenu.style.display = "block";
        popupVibration();
    })
    cross.addEventListener('click', function () {
        littleMenu.style.display = "none";
        menu.style.display = "block";
        popupVibration();
    })
    switchVibrationIcon(isVibrationMuted());

})

let isOnMobile = (window.innerWidth <= 821);

function alertBattery() {
    if (!isOnMobile) return;
    navigator.getBattery().then(function (battery) {
        let level = battery.level * 100;
        console.log("Battery level: " + level + "%");
        if (level <= 90) {
            alert("Warning: battery level is below 15%");
        }
    });
}

let btn = document.getElementById("b");
btn.addEventListener('click', alertBattery);

function muteVibration() {
    let isMuted = muteVibrationUpdateCookie()
    switchVibrationIcon(isMuted);
    if (!isMuted) notificationVibration();
}

function switchVibrationIcon(isMuted) {
    if (isMuted) {
        document.getElementById("notVibrating").style.display = "inline-block";
        document.getElementById("vibrating").style.display = "none";
        document.getElementById("muteVibrationButton").style.backgroundColor = "#4b7f82";
    } else {
        document.getElementById("vibrating").style.display = "inline-block";
        document.getElementById("notVibrating").style.display = "none";
        document.getElementById("muteVibrationButton").style.backgroundColor = "rgb(128 215 221)";
    }
}

function cancelGame() {
    socket.emit('cancelQueue', JSON.stringify({token: token}));
}

document.getElementById("logout").addEventListener('click', logout);

function getAllGames() {
    findToken()
    console.log(token)
    const values = {
        token: token,
    };

    fetch(address + `/api/game/retrieveGames`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
    })
        .then(response => response.json())
        .then(data => {
            //document.cookie = "token="+data.token+";path=/";
            addGamesSavedHtml(data);
            //window.location.href = '/games/local/local_game.html';
        })
        .catch(error => {
            console.error(error);
        });
}

function deleteSavedGame() {
    findToken();
    fetch(address + `/api/game/deleteGame`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({token: token})
    })
        .then(res => res.json())
        .then(data => console.log(data))
        .catch(error => console.error(error));
}

function addGamesSavedHtml(tabOfGames) {
    for (let i = 0; i < tabOfGames.length; i++) {
        let dropdown = document.querySelector('.dropdown');
        let newItem = document.createElement('div');
        let typeOfGame = '/games/local/local_game.html';
        if (tabOfGames[i].gameType === 'easy') typeOfGame = '/games/bot/easy/bot_game.html';
        else if (tabOfGames[i].gameType === 'medium') typeOfGame = '/games/bot/medium/bot_game.html';
        let address = '..' + typeOfGame + '?id=' + tabOfGames[i]._id;
        newItem.innerHTML = `
                            <div class="item" onclick="window.location.href='${address}'">
                                <h4>${tabOfGames[i].gameType}: ${tabOfGames[i].name}</h4>
                            </div>`;
        dropdown.appendChild(newItem);
        document.getElementById("trash").addEventListener('click', function () {
            console.log("CLEARING EVERYTHING");
            deleteSavedGame(tabOfGames[i]._id);
            window.location.reload();
        });

    }
}

document.getElementById("profile").addEventListener('click', function () {
    let username = findUsername();
    window.location.href = '../profile/profile.html?name=' + username;
});


function findGame() {
    findToken();
    let roomName = token + Math.floor(Math.random() * 100000000000000000);
    socket.emit('searchMultiGame', JSON.stringify({
        room: roomName, token: token
    }));
}

function logout() {
    localStorage.removeItem('theChallengerList');
    document.cookie = "token=" + undefined + ";path=/";
    document.cookie = "username=" + undefined + ";path=/";
    window.location.href = "/";
}
