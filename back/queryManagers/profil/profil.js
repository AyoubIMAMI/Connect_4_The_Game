const mongoDBConnection = require("../mongoDBConnection");

/**
 * This function manages the request to the profil API
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
        if (filePath[3] === "retrieveAllStats") {
            request.on('end', function () {
                mongoDBConnection.retrieveAllStats(response, body.token, body.friendName);
            });
        }
        else {
            response.statusCode = 400;
            response.end(`Something in your request (${request.url}) is strange...`);
        }
    }
}

exports.manage = manageRequest;
