// The http module contains methods to handle http queries.
const http = require('http')
// Let's import our logic.
const fileQuery = require('./queryManagers/front.js')
const apiQuery = require('./queryManagers/api.js')
const aiQuery = require('./logic/weakAI.js')
const aiAdvancedQuery = require('./logic/strongAI.js')
const gameManagementQuery= require('./queryManagers/game/socketManager')


/* The http module contains a createServer function, which takes one argument, which is the function that
 * will be called whenever a new request arrives to the server.
 */
let server = http.createServer(function (request, response) {
    apiQuery.addCors(request,response);

    // First, let's check the URL to see if it's a REST request or a file request.
    // We will remove all cases of "../" in the url for security purposes.
    let filePath = request.url.split("/").filter(function(elem) {
        return elem !== "..";
    });

    try {
        if (request.method === 'OPTIONS') {
            console.log("OPTIONS FETCHING: " + request.method);
            response.statusCode = 200;
            response.end('We are in the options fetching');
        }
        // If the URL starts by /api, then it's a REST request (you can change that if you want).
        else if (filePath[1] === "api") {
            apiQuery.manage(request, response);
            // If it doesn't start by /api, then it's a request for a file.
        } else {
            fileQuery.manage(request, response);
        }
    } catch(error) {
        console.log(`error while processing ${request.url}: ${error}`)
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange... with error: ${error}`);
    }
});

const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: ["http://4quarts.connect4.academy", "http://15.236.190.187", "http://localhost"]
    }
});

io.on('connection',socket => {
    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        io.to(roomName).emit('updateRoom', roomName);
    });
    console.log("Connected");

    socket.on('play',(state) => {
        io.to(state.id).emit('doMove',JSON.stringify(aiQuery.computeMove(state)));
    });

    socket.on('playAdv',async (state) => {
        let next = await aiAdvancedQuery.TestNextMove(state.pos);
        console.log("gamestate id "+state.id);
        console.log(next);
        io.to(state.id).emit('doMove', JSON.stringify(next));
    });

    socket.on('initAdv',(initState) => {
        aiAdvancedQuery.setup(initState);
    });
})

gameManagementQuery.setUpSockets(io);

// For the server to be listening to request, it needs a port, which is set thanks to the listen function.
server.listen(8000);
