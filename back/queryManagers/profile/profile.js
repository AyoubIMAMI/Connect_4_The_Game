const mongoDBConnection = require("../mongoDBConnection");

/**
 * This function manages the request to the profile API
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
                mongoDBConnection.retrieveAllStats(response, body.token, body.friendName)
                    .then(() => console.log("Retrieving statistics from database"));
            });
        } else {
            response.statusCode = 400;
            response.end(`Something in your request (${request.url}) is strange...`);
        }
    }
}

exports.manage = manageRequest;
