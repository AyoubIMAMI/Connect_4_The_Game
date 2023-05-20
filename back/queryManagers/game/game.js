const mongoDBConnection = require("../databaseManager.js");

/**
 * This function manages the request to the Game API
 * @param request
 * @param response
 */
function manageRequest(request, response) {
    let filePath = request.url.split("/").filter(function (elem) {
        return elem !== "..";
    });

    if (request.method === 'POST') {
        let body = '';
        request.on('data', function (data) {
            body += data;
        });

        response.statusCode = 200;

        if (filePath[3] == null) {
            request.on('end', function () {
                mongoDBConnection.createGame(response, body).then(() => console.log("create game"));
            });
        }

        else if (filePath[3] === "retrieveGames") {
            request.on('end', function () {
                mongoDBConnection.findAllGames(response, body).then(() => console.log("retrieveGames"));
            });
        }

        else if (filePath[3] === "verifToken") {
            request.on('end', function () {
                mongoDBConnection.retrieveGames(response, body).then(() => console.log("verifyToken"));
            });

        }

        else if (filePath[3] === "retrieveGameWithId") {
            request.on('end', function () {
                mongoDBConnection.retrieveGamesWithId(response, body).then(() => console.log("retrieveGamesWithId"));
            });
        }

        else if (filePath[3] === "deleteGame") {
            request.on('end', function () {
                mongoDBConnection.deleteAllGames(response, body).then(() => console.log("deleteGame"));
            });
        }
    }
    else {
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
}

exports.manage = manageRequest;
