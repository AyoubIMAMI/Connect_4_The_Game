const mongoDBConnection = require("../mongoDBConnection");

/**
 * This function manages the request to the friends API
 * @param request url of the request
 * @param response
 */
function manageRequest(request, response) {
    let filePath = request.url.split("/").filter(function(elem) {
        return elem !== "..";
    });

    if (request.method === 'POST'){
        let body='';
        request.on('data', function (data) {
            body += data;
        });

        if (filePath[3] === "friendRequest") {
            request.on('end', function () {
                const values = JSON.parse(body);
                mongoDBConnection.friendRequest(response, values.from, values.friend)
                    .then(() => {console.log("Request: friendRequest")});
            });
        }

        else if (filePath[3] === "retrieveFriendList") {
            request.on('end', function () {
                const values = JSON.parse(body);
                mongoDBConnection.retrieveFriendList(response, values.token)
                    .then(() => {console.log("Request: retrieveFriendList")});
            });
        }

        else if (filePath[3] === "removeFriend") {
            request.on('end', function () {
                const values = JSON.parse(body);
                mongoDBConnection.removeFriend(response, values.token, values.friendToRemove)
                    .then(() => {console.log("Request: removeFriend")});
            });
        }

        else if (filePath[3] === "retrieveFriendRequest") {
            request.on('end', function () {
                const values = JSON.parse(body);
                mongoDBConnection.retrieveFriendRequest(response, values.token)
                    .then(() => {console.log("Request: retrieveFriendRequest")});
            });
        }

        else if (filePath[3] === "acceptFriendRequest") {
            request.on('end', function () {
                const values = JSON.parse(body);
                mongoDBConnection.acceptFriendRequest(response, values.token, values.friendToAccept)
                    .then(() => {console.log("Request: acceptFriendRequest")});
            });
        }

        else if (filePath[3] === "declineFriendRequest") {
            request.on('end', function () {
                const values = JSON.parse(body);
                mongoDBConnection.declineFriendRequest(response, values.token, values.friendToDecline)
                    .then(() => {console.log("Request: declineFriendRequest")});
            });
        }
    }
    else{
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
}

exports.manage = manageRequest;
