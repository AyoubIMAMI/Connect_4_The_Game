import {findToken, token, address} from "../games/dataManager.js";
import {notLoggedRedirection} from "../games/gameManagement.js";

/**
 * This class manage the users profile
 * There are:
 *  - the rank
 *  - the statistics
 *  - the success
 */

document.addEventListener('DOMContentLoaded', init);

// Statistics, rank and success
let wins = 0
let losses = 0;
let draws = 0;
let elo = 1000;
let numberFriends = 0;

/**
 * Initialize the page
 * @returns {Promise<void>}
 */
export async function init() {
    window.onload = function () {
        window.scrollTo(0, 0);
    }
    // If not logged in, redirected to the login page
    await notLoggedRedirection();

    // Get the username from the url - it could be the user profile or his friend profile
    const urlParams = new URLSearchParams(window.location.search);
    let username = urlParams.get('name');
    await findAllStats(username);
    document.getElementById("username").innerHTML = username + "'s achievements";
    document.getElementById("games-played").innerHTML = wins + losses + draws + "";

    if (wins + losses + draws === 0) document.getElementById("winRate").innerHTML = "0%";
    else document.getElementById("winRate").innerHTML = Math.round((wins / (wins + losses + draws)) * 100) + "%";

    const rankImage = document.querySelector('#rankImage');

    // Selecting the rank according to the elo
    if (elo <= 50) {
        rankImage.src = '../images/uninstall.png';
        document.getElementById("rank").innerHTML = "Uninstall (" + elo + " elo)";
    }

    if (elo <= 1100 && elo > 50) {
        rankImage.src = '../images/Bronze1.png';
        document.getElementById("rank").innerHTML = "Bronze 1 (" + elo + " elo)";
    } else if (elo <= 1200 && elo > 1100) {
        rankImage.src = '../images/Bronze2.png';
        document.getElementById("rank").innerHTML = "Bronze 2 (" + elo + " elo)";
    } else if (elo <= 1300 && elo > 1200) {
        rankImage.src = '../images/Bronze3.png';
        document.getElementById("rank").innerHTML = "Bronze 3 (" + elo + " elo)";
    } else if (elo <= 1400 && elo > 1300) {
        rankImage.src = '../images/Bronze4.png';
        document.getElementById("rank").innerHTML = "Bronze 4 (" + elo + " elo)";
    } else if (elo <= 1500 && elo > 1400) {
        rankImage.src = '../images/Silver1.png';
        document.getElementById("rank").innerHTML = "Silver 1 (" + elo + " elo)";
    } else if (elo <= 1600 && elo > 1500) {
        rankImage.src = '../images/Silver2.png';
        document.getElementById("rank").innerHTML = "Silver 2 (" + elo + " elo)";
    } else if (elo <= 1700 && elo > 1600) {
        rankImage.src = '../images/Silver3.png';
        document.getElementById("rank").innerHTML = "Silver 3 (" + elo + " elo)";
    } else if (elo <= 1800 && elo > 1700) {
        rankImage.src = '../images/Silver4.png';
        document.getElementById("rank").innerHTML = "Silver 4 (" + elo + " elo)";
    } else if (elo <= 1900 && elo > 1800) {
        rankImage.src = '../images/Gold1.png';
        document.getElementById("rank").innerHTML = "Gold 1 (" + elo + " elo)";
    } else if (elo <= 2000 && elo > 1900) {
        rankImage.src = '../images/Gold2.png';
        document.getElementById("rank").innerHTML = "Gold 2 (" + elo + " elo)";
    } else if (elo <= 2100 && elo > 2000) {
        rankImage.src = '../images/Gold3.png';
        document.getElementById("rank").innerHTML = "Gold 3 (" + elo + " elo)";
    } else if (elo <= 2200 && elo > 2100) {
        rankImage.src = '../images/Gold4.png';
        document.getElementById("rank").innerHTML = "Gold 4 (" + elo + " elo)";
    } else if (elo > 2200) {
        rankImage.src = '../images/Goat.png';
        document.getElementById("rank").innerHTML = "Goat (" + elo + " elo)";
    }

    // Displaying the success
    document.getElementById("noviceWinner").style.width = Math.min(100, Math.round((wins / 10) * 100)) + "%";
    document.getElementById("noviceWinner").innerHTML = Math.min(100, Math.round((wins / 10) * 100)) + "%";
    document.getElementById("novicePlayer").style.width = Math.min(100, Math.round(((wins + losses + draws) / 10) * 100)) + "%";
    document.getElementById("novicePlayer").innerHTML = Math.min(100, Math.round(((wins + losses + draws) / 10) * 100)) + "%";
    document.getElementById("OG").style.width = Math.min(100, Math.round(((wins + losses + draws) / 100) * 100)) + "%";
    document.getElementById("OG").innerHTML = Math.min(Math.round(((wins + losses + draws) / 100) * 100)) + "%";
    document.getElementById("intermediatePlayer").style.width = Math.min(Math.round((elo / 1500) * 100)) + "%";
    document.getElementById("intermediatePlayer").innerHTML = Math.min(100, Math.round((elo / 1500) * 100)) + "%";
    document.getElementById("goodPlayer").style.width = Math.min(100, Math.round((elo / 2300) * 100)) + "%";
    document.getElementById("goodPlayer").innerHTML = Math.min(Math.round((elo / 2300) * 100)) + "%";
    document.getElementById("legendWinner").style.width = Math.min(100, Math.round((wins / 100) * 100)) + "%";
    document.getElementById("legendWinner").innerHTML = Math.min(100, Math.round((wins / 100) * 100)) + "%";
    document.getElementById("intermediateWinner").style.width = Math.min(100, Math.round((wins / 25) * 100)) + "%";
    document.getElementById("intermediateWinner").innerHTML = Math.min(100, Math.round((wins / 25) * 100)) + "%";
    document.getElementById("legendPlayer").style.width = Math.min(100, Math.round(((wins + losses + draws) / 200) * 100)) + "%";
    document.getElementById("legendPlayer").innerHTML = Math.min(100, Math.round(((wins + losses + draws) / 200) * 100)) + "%";
    document.getElementById("good-guy").style.width = Math.min(100, Math.round((numberFriends / 5) * 100)) + "%";
    document.getElementById("good-guy").innerHTML = Math.min(100, Math.round((numberFriends / 5) * 100)) + "%";
}

/**
 * Get the statistics from the backend
 * @param friendName
 * @returns {Promise<void>}
 */
async function findAllStats(friendName) {
    findToken();
    const values = {
        token: token,
        friendName: friendName
    }
    await fetch(address + `/api/profile/retrieveAllStats`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            draws = data.draws;
            document.getElementById("draws").innerHTML = draws;
            wins = data.wins;
            document.getElementById("wins").innerHTML = wins;
            losses = data.losses;
            document.getElementById("losses").innerHTML = losses;
            elo = data.eloPlayer;
            numberFriends = data.nbFriends;

        })
        .catch(error => {
            console.error(error);
        });
    const statsTable = document.getElementById("stats");
    const successTable = document.getElementById("success");
    const statsButton = document.getElementById("stats-btn");
    const successButton = document.getElementById("success-btn");

    function showStats() {
        if (window.innerHeight <= 600) {
            statsTable.style.display = "flex";
            successTable.style.display = "none";
        } else {
            statsTable.style.display = "block";
            successTable.style.display = "none";
        }
    }

    function showSuccess() {
        if (window.innerHeight <= 600) {
            console.log(window.innerHeight);
            statsTable.style.display = "none";
            successTable.style.display = "flex";
        } else {
            statsTable.style.display = "none";
            successTable.style.display = "block";
        }
    }

    statsButton.addEventListener('click', showStats);
    successButton.addEventListener('click', showSuccess);
}
