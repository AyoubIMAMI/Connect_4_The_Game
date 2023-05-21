console.log(document.cookie)
import {findTokenReturned, findUsername} from "../games/gameManagement.js"
import {address} from "../games/dataManager.js";
import {errorVibration, registerVibration} from "../plugins/vibration.js";

/**
 * This class manage the login and the registration
 *
 * If a user come back here without getting logged out,
 * he can retrieve his session without connecting again.
 *
 * There are securities on the inputs and on the password
 */

// Retrieve session if not previously logged out
window.addEventListener("load", function () {
    document.addEventListener("deviceready", onDeviceReady, false);
    localStorage.setItem("theChallengerList", JSON.stringify([]));
    if (findTokenReturned() !== "undefined" && findTokenReturned() !== undefined && findUsername() !== "undefined") {
        document.getElementById("usernameToContinueWith").innerHTML = findUsername();
        document.getElementById("retrieveSession").style.display = "flex";
        document.getElementById("usernameToContinueWith").addEventListener('click', function () {
            window.location.href = "../home/home.html"
        })
    }
});

function onDeviceReady() {
    console.log(navigator.vibrate);
    console.log("Device is ready!");
}

// Login and Register tabs
let buttonLog = document.getElementById("login")
buttonLog.addEventListener("click", login_page)
let buttonReg = document.getElementById("signIn")
buttonReg.addEventListener("click", signIn_page)

// Show the registration tab
function signIn_page() {
    buttonLog.style.backgroundColor = "rgba(0,0,0,0)";
    buttonReg.style.backgroundColor = "rgba(150,144,133,0.53)";
    document.getElementById("log").style.display = "none";
    document.getElementById("reg").style.display = "block";
}

// Show the login tab
function login_page() {
    buttonReg.style.backgroundColor = "rgba(0,0,0,0)";
    buttonLog.style.backgroundColor = "rgba(150,144,133,0.53)";
    document.getElementById("reg").style.display = "none";
    document.getElementById("log").style.display = "block";
}

// Login using the button or pressing the 'Enter' key
document.getElementById("loginButton").addEventListener('click', login);
document.getElementById("usernameLoginInput").addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await login();
    }
});
document.getElementById("passwordLoginInput").addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await login();
    }
});

/**
 * Login: send the inputs to the backend for it to check if the credentials correspond
 * @returns {Promise<void>}
 */
async function login() {
    const user = document.getElementsByName("log_name")[0].value;
    const password = hash(document.getElementsByName("log_password")[0].value);

    // Security to avoid blank inputs
    if (user === "" || password === "") {
        document.getElementById("errorMessageLogin").innerText = "Please complete all fields";
        document.getElementById("errorMessageLogin").style.display = "block";
        return;
    }

    const values = {
        username: user,
        password: password,
    };

    fetch(address + '/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
    })
        .then(response => response.json())
        .then(data => {
            if (data && data.token) {
                document.cookie = "token=" + data.token + ";path=/";
                document.cookie = "username=" + data.username + ";path=/";
                console.log(document.cookie);
                window.location.href = '/home/home.html';
            } else {
                document.getElementById("errorMessageLogin").innerText = "Wrong username or password";
                document.getElementById("errorMessageLogin").style.display = "block";
            }
        })
        .catch(error => {
            console.error(error);
        });
}

// Register using the button or pressing the 'Enter' key
document.getElementById("registerButton").addEventListener('click', register);
document.getElementById("usernameRegisterInput").addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await register();
    }
});
document.getElementById("mailRegisterInput").addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await register();
    }
});
document.getElementById("passwordRegisterInput").addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await register();
    }
});
document.getElementById("confirmPasswordRegisterInput").addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await register();
    }
});


/**
 * Register: send the inputs to the backend for it to check if the username is available
 * and save the data in the database
 * @returns {Promise<void>}
 */
async function register() {
    const name = document.getElementsByName("reg_name")[0].value;
    const mail = document.getElementsByName("reg_email")[0].value;
    const clearPassword = document.getElementsByName("reg_password")[0].value;
    const confirmClearPassword = document.getElementsByName("reg_password2")[0].value;

    // Security to avoid blank inputs
    if (name === "" || mail === "" || clearPassword === "" || confirmClearPassword === "") {
        document.getElementById("errorMessage").innerText = "Please complete all fields";
        document.getElementById("errorMessage").style.display = "block";
        errorVibration();
        return;
    }

    // Security on the email format
    if (!isEmailFormatValid(mail)) {
        document.getElementById("errorMessage").innerText = "Invalid email format - Please enter your email";
        document.getElementById("errorMessage").style.display = "block";
        errorVibration();
        return;
    }

    // Security on the password validation before sending the data to the backend
    if (confirmPassword(clearPassword, confirmClearPassword)) {
        console.log("passwords are the same");
        const values = {
            username: name,
            password: hash(clearPassword),
            email: mail,
        };

        fetch(address + '/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(values)
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.status === "failure") {
                    window.alert("Username already taken");
                    errorVibration();
                } else {
                    document.getElementById("errorMessage").style.display = "none";
                    window.alert("Registration successful - You can now log in");
                    registerVibration();
                }
            });
    } else {
        document.getElementById("errorMessage").innerText = "Passwords are not the same!";
        document.getElementById("errorMessage").style.display = "block";
        errorVibration();
    }
}

/**
 * Caesar code to encrypt the password in the frontend
 * which will be encrypted again in the backend with an SHA-256 function
 * @param password
 * @returns {string} the encrypted password
 */
function hash(password) {
    let key = 7;
    let result = "";
    for (let i = 0; i < password.length; i++) {
        let char = password[i];
        // If the letter is an upper case
        if (char.match(/[A-Z]/i)) {
            let code = password.charCodeAt(i); // Getting the ASCII code
            code += key; // Add the key to the ASCII code
            // Coming back to 'A' if we go over 'Z' (upper case)
            if (char === char.toUpperCase() && code > 90) {
                code = 64 + (code - 90);
            }
            // Coming back to 'a' if we go over 'z' (lower case)
            else if (char === char.toLowerCase() && code > 122) {
                code = 96 + (code - 122);
            }
            result += String.fromCharCode(code); // Adding to the encrypted string
        } else {
            result += char; // If the character is not a letter, we let it as it is
        }
    }
    return result;
}

/**
 * Verification on the password - are both password inputs are the same
 * @param clearPassword
 * @param confirmClearPassword
 * @returns {boolean} true if they are the same, false otherwise
 */
function confirmPassword(clearPassword, confirmClearPassword) {
    const hashedPassword = hash(clearPassword);
    const confirmedHashedPassword = hash(confirmClearPassword);
    return (hashedPassword === confirmedHashedPassword);
}

/**
 * Verification on the email format: theUserName@something.somethingElse
 * @param mail
 * @returns {boolean} true the mail format is valid
 */
function isEmailFormatValid(mail) {
    const emailRegex = /\S+@\S+\.\S+/;
    return emailRegex.test(mail);

}
