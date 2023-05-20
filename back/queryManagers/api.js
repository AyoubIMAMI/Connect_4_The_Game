const apiLogin = require('./login/login.js')
const apiRegister = require('./login/register.js')
const apiGame = require('./game/game.js')
const apiFriend = require('./friends/friends.js')
const apiProfile = require('./profile/profile.js')

// Main method, exported at the end of the file. It's the one that will be called when a REST request is received.
function manageRequest(request, response) {
    addCors(request, response);

    let filePath = request.url.split("/").filter(function (elem) {
        return elem !== "..";
    });
    if (filePath[2] === "login") {
        apiLogin.manage(request, response);
        // If it doesn't start by /api, then it's a request for a file.
    } else if (filePath[2] === "register") {
        apiRegister.manage(request, response);
        // If it doesn't start by /api, then it's a request for a file.
    } else if (filePath[2] === "game") {
        apiGame.manage(request, response);
        // If it doesn't start by /api, then it's a request for a file.
    } else if (filePath[2] === "friends") {
        apiFriend.manage(request, response);
        // If it doesn't start by /api, then it's a request for a file.
    } else if (filePath[2] === "profile") {
        apiProfile.manage(request, response);
        // If it doesn't start by /api, then it's a request for a file.
    } else {
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
}

/* This method is a helper in case you stumble upon CORS problems. It shouldn't be used as-is:
** Access-Control-Allow-Methods should only contain the authorized method for the url that has been targeted
** (for instance, some of your api urls may accept GET and POST request whereas some others will only accept PUT).
** Access-Control-Allow-Headers is an example of how to authorize some headers, the ones given in this example
** are probably not the ones you will need. */
function addCors(request, response) {
    // Website you wish to allow to connect to your server.
    response.setHeader('Access-Control-Allow-Origin', '*');

    if (request.method === "OPTIONS") {
        response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
    } else {
        response.setHeader('Access-Control-Allow-Origin', '*');
    }
    // Request methods you wish to allow.
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow.
    response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Access-Control-Request-Method, Access-Control-Request-Headers, Origin');
    // Set to true if you need the website to include cookies in the requests sent to the API.
    response.setHeader('Access-Control-Allow-Credentials', true);
}

exports.manage = manageRequest;
exports.addCors = addCors;
