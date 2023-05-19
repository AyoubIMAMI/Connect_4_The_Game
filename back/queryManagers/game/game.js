const mongoDBConnection = require("../mongoDBConnection.js");

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
                const bodyParsed = JSON.parse(body);
                mongoDBConnection.createGame(response, bodyParsed).then(() => console.log("create game"));
            });
        }

        else if (filePath[3] === "retrieveGames") {
            request.on('end', function () {
                const bodyParsed = JSON.parse(body);
                mongoDBConnection.findAllGames(response, bodyParsed).then(() => console.log("retrieveGames"));
            });
        }

        else if (filePath[3] === "verifToken") {
            request.on('end', function () {
                const bodyParsed = JSON.parse(body);
                mongoDBConnection.retrieveGames(response, bodyParsed).then(() => console.log("verifyToken"));
            });

        }

        else if (filePath[3] === "retrieveGameWithId") {
            request.on('end', function () {
                const bodyParsed = JSON.parse(body);
                mongoDBConnection.retrieveGamesWithId(response, bodyParsed).then(() => console.log("retrieveGamesWithId"));
            });
        }

        else if (filePath[3] === "deleteGame") {
            request.on('end', function () {
                const bodyParsed = JSON.parse(body);
                mongoDBConnection.deleteAllGames(response, bodyParsed).then(() => console.log("deleteGame"));
            });
        }
    }
    else {
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
}

exports.manage = manageRequest;
