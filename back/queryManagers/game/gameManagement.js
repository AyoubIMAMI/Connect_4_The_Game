const {MongoClient} = require("mongodb");
const {response} = require("express");
let roomInSearch=null;
const mapGames= new Map();
const url = 'mongodb://admin:b0ttle0fW4t3r@mongodb/admin?directConnection=true';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
const ObjectID = require('mongodb').ObjectId;

let firstPlayerName;
let secondPlayerName;
/**
 *
 * @fileoverview this file contains the functions to manage the game and the sockets
 *
 * @author      Weel Ben Aissa
 * @author      Ayoub Imami
 * @author      Mourad Karrakchou
 *
 */

/**
 * This function sets up the sockets and the connection to the database
 * @param io the socket.io object
 */
function setUpSockets(io){
    const MongoClient = require('mongodb').MongoClient;

    const url = 'mongodb://admin:b0ttle0fW4t3r@mongodb/admin?directConnection=true';
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

    /**
     * This function retrieves the user from the database
     * @param token the token of the user
     * @returns {Promise<Document & {_id: InferIdType<Document>}>}
     */
    async function retrieveUserFromDataBase(token){
        await client.connect();
        const db = client.db("connect4");
        //await db.addUser("admin", "admin", {roles: [{role: "readWrite", db: "connect4"}]});
        const gameCollection = db.collection("games");

        const collection = db.collection("log");
        const item = await collection.findOne({token:token});
        return item;
    }

    /**
     * This function retrieves the user from the database by name
     * @param name the name of the user
     * @returns {Promise<Document & {_id: InferIdType<Document>}>}
     */

    async function retrieveUserFromDataBaseByName(name){
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection("log");
        let user = await collection.findOne({username: name});
        return user;
    }

    /**
     * This function add a message to the database between two users
     * @param from the user who sent the message
     * @param to the user who received the message
     * @param message the message
     * @param heRead if the user has read the message
     * @returns {Promise<InsertOneResult<Document>>}
     */
    async function saveMessageToDataBase(from,to,message,heRead){
        await client.connect();
        const db = client.db("connect4");
        const chatCollection = db.collection("chat");
        const item = await chatCollection.insertOne({from:from,to:to,message:message,heRead:heRead});
        return item;
    }

    /**
     * this function load all the messages to a user
     * @param to the user who received the message
     * @returns {Promise<WithId<Document>[]>}
     */
    async function loadAllMessagePending(to){
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        const chatCollection = db.collection("chat");
        const item = await chatCollection.find({to:to,heRead:false}).toArray();
        return item;
    }

    /**
     * load all the messages from a user to another
     * @param from the user who sent the message
     * @param to the user who received the message
     * @returns {Promise<WithId<Document>[]>}
     */
    async function loadAllMessageFromConversation(from,to){
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        const chatCollection = db.collection("chat");
        console.log("updating: from "+from+" to "+to);
        await chatCollection.updateMany({from:from,to: to}, {$set: {heRead: true}});
        if (findSocketByName(to,connectedSockets)===null)
            return [];
        findSocketByName(to,connectedSockets).emit('loadAllMessagePending', await loadAllMessagePending(to));
        const item = await chatCollection.find({ $or:[{from:from,to:to},{from:to,to:from}]}).toArray();
        return item;
    }

    /**
     * the nexts functions are created to setup our sockets and to manage the game
     * @type {T | Map<SocketId, Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>>}
     */
    let connectedSockets = io.sockets.sockets;

    io.on('connection',socket => {
        socket.on('searchMultiGame', async (playerReq) => {
            let player = JSON.parse(playerReq);
            let roomName = player.room;
            socket.join(roomName);
            let user = await retrieveUserFromDataBase(player.token);
            if (user === null) return;
            io.to(roomName).emit('inQueue', null);
            if (roomInSearch == null) {
                roomInSearch = {
                    room: player.room,
                    userID: user._id.toString(),
                    username:user.username,
                    ready: false,
                    elo: user.elo,
                }
            } else if(user._id.toString()!==roomInSearch.userID) {
                let matchID = getRandomNumber(0, 100000000000) + '';
                const matchInfo = {
                    player1: {
                        room: roomInSearch.room,
                        userID: roomInSearch.userID,
                        username:roomInSearch.username,
                        ready: false,
                        elo: roomInSearch.elo
                    },
                    player2: {
                        room: player.room,
                        userID: user._id.toString(),
                        username:user.username,
                        ready: false,
                        elo: user.elo
                    },
                    board: createBoard(),
                    isFriendGame: false
                };
                console.log(matchInfo)
                mapGames.set(matchID, matchInfo);
                io.to(roomInSearch.room).emit('matchFound', matchID);
                io.to(roomName).emit('matchFound', matchID);

                firstPlayerName = matchInfo.player1.username;
                secondPlayerName = matchInfo.player2.username;

                roomInSearch = null;
            }
            console.log("at the end" + roomInSearch);
        })
        socket.on('cancelQueue', async (playerReq) => {
            let player = JSON.parse(playerReq);
            let user = await retrieveUserFromDataBase(player.token);
            if (user === null) return;

            if (roomInSearch != null && roomInSearch.userID===user._id.toString()) {
                let roomName = roomInSearch.room;
                roomInSearch=null;
                io.to(roomName).emit('cancel');
            }
        })

        socket.on('initMulti', async (playerReq) => {
            let request = JSON.parse(playerReq);
            let gameInfo = mapGames.get(request.matchID);
            let user = await retrieveUserFromDataBase(request.token);
            if (user === null) return;

            if (user._id.toString() === gameInfo.player1.userID) {
                console.log("player1"+user.username);
                socket.join(gameInfo.player1.room);
                if (gameInfo.isFriendGame) {
                    io.to(gameInfo.player1.room).emit('firstPlayerInit', null);
                } else {
                    io.to(gameInfo.player1.room).emit('firstPlayerInit', {
                        yourElo: gameInfo.player1.elo,
                        opponentElo: gameInfo.player2.elo
                    });
                }
            } else if (user._id.toString() === gameInfo.player2.userID) {
                console.log("player2"+user.username);
                socket.join(gameInfo.player2.room);
                if (gameInfo.isFriendGame) {
                    io.to(gameInfo.player2.room).emit('secondPlayerInit', null);
                } else {
                    io.to(gameInfo.player2.room).emit('secondPlayerInit', {
                        yourElo: gameInfo.player2.elo,
                        opponentElo: gameInfo.player1.elo
                    });
                }
            }
        })
        socket.on('chat', async (playerReq) => {
            let request = JSON.parse(playerReq);
            let gameInfo = mapGames.get(request.matchID);
            let user = await retrieveUserFromDataBase(request.token);
            if (user === null) return;

            if (user._id.toString() === gameInfo.player1.userID) {
                io.to(gameInfo.player2.room).emit('message', {
                    username:gameInfo.player1.username,
                    message:request.chat
                });
            } else if (user._id.toString() === gameInfo.player2.userID) {
                io.to(gameInfo.player1.room).emit('message', {
                    username:gameInfo.player2.username,
                    message:request.chat
                });
            }
        })

        socket.on('friendChat', async (request) => {
            let user = await retrieveUserFromDataBase(request.token);
            if (user === null) return;

            console.log(user);
            let heRead=false;

            let item=await saveMessageToDataBase(user.username,request.friendUsername,request.chat,heRead);
            if (findSocketByName(request.friendUsername,connectedSockets)!==null)
                findSocketByName(request.friendUsername,connectedSockets).emit('privateMessage', {
                    username:user.username,
                    message:request.chat,
                    item:item});
        }
        )
        socket.on('findAllMessagePending', async (request) => {
            let user = await retrieveUserFromDataBase(request.token);
            if (user === null|| findSocketByName(user.username,connectedSockets)===null) return;
            let allUserMessages=await loadAllMessagePending(user.username);
            findSocketByName(user.username,connectedSockets).emit('loadAllMessagePending', allUserMessages);
        })
        socket.on('loadFriendChat', async (request) => {
            let user = await retrieveUserFromDataBase(request.token);
            if (user === null|| findSocketByName(user.username,connectedSockets)===null) return;

            let allUserMessages=await loadAllMessageFromConversation(request.friendUsername,user.username);
            findSocketByName(user.username,connectedSockets).emit('allConversationPrivateMessages', allUserMessages)})

        socket.on('setToRead', async (request) => {
            console.log(request);
            let to = await retrieveUserFromDataBase(request.token);
            if (to === null) return;

            await client.connect();

            const db = client.db("connect4");
            const chatCollection = db.collection("chat");
            let updated= await chatCollection.updateOne({_id:new ObjectID(request.item.insertedId),to:to.username}, {$set: {heRead: true}});
            if (updated.modifiedCount>0)
                findSocketByName(to.username,connectedSockets).emit('loadAllMessagePending', loadAllMessagePending(to));
        })

        socket.on('playMulti', async (playerReq) => {
            let request = JSON.parse(playerReq);
            console.log(playerReq);
            let gameInfo = mapGames.get(request.matchID);
            console.log(mapGames);
            let moveToCheck;
            let user = await retrieveUserFromDataBase(request.token);
            if (user === null) return;
            if (user._id.toString() === gameInfo.player1.userID && !checkIllegalMove(gameInfo.board, request.pos[0], 1)) {
                gameInfo.board[request.pos[0]][request.pos[1]] = 1;
                io.to(gameInfo.player2.room).emit('doMoveMulti', JSON.stringify(request.pos));
                moveToCheck = {
                    board: gameInfo.board,
                    playerTurn: 1,
                    i: request.pos[1],
                    j: request.pos[0],
                }
            } else if (user._id.toString() === gameInfo.player2.userID && !checkIllegalMove(gameInfo.board, request.pos[0], -1)) {
                gameInfo.board[request.pos[0]][request.pos[1]] = -1;
                io.to(gameInfo.player1.room).emit('doMoveMulti', JSON.stringify(request.pos));
                moveToCheck = {
                    board: gameInfo.board,
                    playerTurn: -1,
                    i: request.pos[1],
                    j: request.pos[0],
                }
            } else {
                return;
            }
            let check = checkMove(moveToCheck);
            if (check.state === "over") {
                if (check.winner === 1) {
                    if (gameInfo.isFriendGame) {
                        io.to(gameInfo.player1.room).emit('win', null);
                        io.to(gameInfo.player2.room).emit('lose', null);

                        io.to(gameInfo.player1.room).emit('stopTimer', null);
                        io.to(gameInfo.player2.room).emit('stopTimer', null);
                    }
                    else {
                        let oldElo1 = gameInfo.player1.elo;
                        let oldElo2 = gameInfo.player2.elo;
                        let newElo1 = calculateNewElo(gameInfo.player1.elo, gameInfo.player2.elo, 1)
                        await addElo(gameInfo.player1.username, newElo1);
                        await addWins(gameInfo.player1.username)
                        await addLosses(gameInfo.player2.username)
                        let newElo2 = calculateNewElo(gameInfo.player2.elo, gameInfo.player1.elo, 0)
                        await addElo(gameInfo.player2.username, newElo2);
                        let delta1 = newElo1 - oldElo1;
                        let delta2 = newElo2 - oldElo2;
                        io.to(gameInfo.player1.room).emit('win', delta1);
                        io.to(gameInfo.player2.room).emit('lose', delta2);

                        io.to(gameInfo.player1.room).emit('stopTimer', null);
                        io.to(gameInfo.player2.room).emit('stopTimer', null);
                    }

                } else if (check.winner === 0) {
                    io.to(gameInfo.player1.room).emit('tie', null);
                    io.to(gameInfo.player2.room).emit('tie', null);

                    io.to(gameInfo.player1.room).emit('stopTimer', null);
                    io.to(gameInfo.player2.room).emit('stopTimer', null);

                    await addDraws(gameInfo.player1.username)
                    await addDraws(gameInfo.player2.username)

                } else {
                    if (gameInfo.isFriendGame) {
                        io.to(gameInfo.player1.room).emit('lose', null);
                        io.to(gameInfo.player2.room).emit('win', null);

                        io.to(gameInfo.player1.room).emit('stopTimer', null);
                        io.to(gameInfo.player2.room).emit('stopTimer', null);
                    }
                    else {
                        let oldElo1 = gameInfo.player1.elo;
                        let oldElo2 = gameInfo.player2.elo;
                        let newElo2 = calculateNewElo(gameInfo.player2.elo, gameInfo.player1.elo, 1);
                        await addElo(gameInfo.player2.username, newElo2);
                        await addWins(gameInfo.player2.username)
                        await addLosses(gameInfo.player1.username)
                        let newElo1 = calculateNewElo(gameInfo.player1.elo, gameInfo.player2.elo, 0)
                        await addElo(gameInfo.player1.username, newElo1);
                        let delta1 = oldElo1 - newElo1;
                        let delta2 = oldElo2 - newElo2;
                        console.log("old elo " + oldElo1);
                        console.log("new elo " + newElo1);
                        console.log("delta " + delta1);
                        io.to(gameInfo.player1.room).emit('lose', delta1);
                        io.to(gameInfo.player2.room).emit('win', delta2);

                        io.to(gameInfo.player1.room).emit('stopTimer', null);
                        io.to(gameInfo.player2.room).emit('stopTimer', null);
                    }
                }
            }

            else {
                io.to(gameInfo.player1.room).emit('updateColor', null);
                io.to(gameInfo.player2.room).emit('updateColor', null);
                io.to(gameInfo.player1.room).emit('timerReset', null);
                io.to(gameInfo.player2.room).emit('timerReset', null);
            }
        })

        let playerStillInGameNumber = 0;
        socket.on('timeOver', async (data) => {
            playerStillInGameNumber++;

            if (playerStillInGameNumber < 2) {
                let player = await retrieveUserFromDataBase(data.token);
                if (player === null) return;
                let playerName = player.username;

                let gameInfo = mapGames.get(data.matchID);
                let player1Room = gameInfo.player1.room;
                let player2Room = gameInfo.player2.room;

                let losingPlayerRoom;
                let winningPlayerRoom;

                let didPlayer1Win;
                let didPlayer2Win;

                if (data.itsMyTurn) {
                    if (playerName === gameInfo.player1.username) {
                        losingPlayerRoom = player1Room;
                        winningPlayerRoom = player2Room;
                        didPlayer1Win = 0;
                        didPlayer2Win = 1;
                    } else {
                        losingPlayerRoom = player2Room;
                        winningPlayerRoom = player1Room;
                        didPlayer1Win = 1;
                        didPlayer2Win = 0;
                    }
                } else {
                    if (playerName === gameInfo.player1.username) {
                        losingPlayerRoom = player2Room;
                        winningPlayerRoom = player1Room;
                        didPlayer1Win = 1;
                        didPlayer2Win = 0;
                    } else {
                        losingPlayerRoom = player1Room;
                        winningPlayerRoom = player2Room;
                        didPlayer1Win = 0;
                        didPlayer2Win = 1;
                    }
                }

                if (gameInfo.isFriendGame) {
                    io.to(losingPlayerRoom).emit('lose', null);
                    io.to(winningPlayerRoom).emit('win', null);
                } else {
                    let oldElo1 = gameInfo.player1.elo;
                    let oldElo2 = gameInfo.player2.elo;
                    let newElo1 = calculateNewElo(gameInfo.player1.elo, gameInfo.player2.elo, didPlayer1Win)
                    let newElo2 = calculateNewElo(gameInfo.player2.elo, gameInfo.player1.elo, didPlayer2Win);

                    let delta1 = oldElo1 - newElo1;
                    let delta2 = oldElo2 - newElo2;

                    await addElo(gameInfo.player1.username, newElo1);
                    await addElo(gameInfo.player2.username, newElo2);

                    if (didPlayer1Win === 1) {
                        await addWins(gameInfo.player1.username);
                        await addLosses(gameInfo.player2.username);
                        io.to(losingPlayerRoom).emit('lose', delta2);
                        io.to(winningPlayerRoom).emit('win', delta1);
                    } else {
                        await addWins(gameInfo.player2.username);
                        await addLosses(gameInfo.player1.username);
                        io.to(losingPlayerRoom).emit('lose', delta1);
                        io.to(winningPlayerRoom).emit('win', delta2);
                    }
                }
            }
            playerStillInGameNumber = 0;
        });

        socket.on('surrender', async (data) => {
            let surrenderedPlayer = await retrieveUserFromDataBase(data.token);
            if (surrenderedPlayer === null) return;
            let surrenderedPlayerName = surrenderedPlayer.username;
            console.log("surrendered player name: " + surrenderedPlayerName)

            let gameInfo = mapGames.get(data.matchID);
            let player1Room = gameInfo.player1.room;
            let player2Room = gameInfo.player2.room;

            let losingPlayerRoom;
            let winningPlayerRoom;

            let didPlayer1Win;
            let didPlayer2Win;

            if (surrenderedPlayerName === gameInfo.player1.username) {
                losingPlayerRoom = player1Room;
                winningPlayerRoom = player2Room;
                didPlayer1Win = 0;
                didPlayer2Win = 1;
            } else {
                losingPlayerRoom = player2Room;
                winningPlayerRoom = player1Room;
                didPlayer1Win = 1;
                didPlayer2Win = 0;
            }

            if (gameInfo.isFriendGame) {
                io.to(losingPlayerRoom).emit('lose', null);
                io.to(winningPlayerRoom).emit('win', null);

                io.to(gameInfo.player1.room).emit('stopTimer', null);
                io.to(gameInfo.player2.room).emit('stopTimer', null);
            } else {
                let oldElo1 = gameInfo.player1.elo;
                let oldElo2 = gameInfo.player2.elo;
                let newElo1 = calculateNewElo(gameInfo.player1.elo, gameInfo.player2.elo, didPlayer1Win)
                let newElo2 = calculateNewElo(gameInfo.player2.elo, gameInfo.player1.elo, didPlayer2Win);

                let delta1 = oldElo1 - newElo1;
                let delta2 = oldElo2 - newElo2;

                await addElo(gameInfo.player1.username, newElo1);
                await addElo(gameInfo.player2.username, newElo2);

                if (didPlayer1Win === 1) {
                    await addWins(gameInfo.player1.username);
                    await addLosses(gameInfo.player2.username);
                    io.to(losingPlayerRoom).emit('lose', delta2);
                    io.to(winningPlayerRoom).emit('win', delta1);

                    io.to(gameInfo.player1.room).emit('stopTimer', null);
                    io.to(gameInfo.player2.room).emit('stopTimer', null);
                } else {
                    await addWins(gameInfo.player2.username);
                    await addLosses(gameInfo.player1.username);
                    io.to(losingPlayerRoom).emit('lose', delta1);
                    io.to(winningPlayerRoom).emit('win', delta2);

                    io.to(gameInfo.player1.room).emit('stopTimer', null);
                    io.to(gameInfo.player2.room).emit('stopTimer', null);
                }
            }

        });

        // Store the username linked to this socket
        socket.on('socketByUsername', function(data) {
            console.log("THIS USERNAME HAS LOGED WITH SOCKET "+data.username)
            socket.username = data.username;
        });

        socket.on('challengeFriend', async (request) => {
            let challengerToken = request.challengerToken;
            let challenger = await retrieveUserFromDataBase(challengerToken);
            if (challenger === null) return;

            let challengerName = challenger.username;
            let challengerSocket = findSocketByName(challengerName, connectedSockets);

            let challengedName = request.challengedName;
            let challengedSocket = findSocketByName(challengedName, connectedSockets);

            if (!challenger.friends.includes(challengedName)) {
                if (challengerSocket !== null) {
                    challengerSocket.emit('notFriendMessage', challengedName);
                }
            } else if (challengedSocket !== null) {
                challengedSocket.emit('friendIsChallenging', challengerName);
            } else {
                if (challengerSocket !== null) {
                    challengerSocket.emit('notConnectedMessage', challengedName);
                }
            }
        })

        socket.on('IAcceptTheChallenge', async (data) => {
            const challengerName = data.challengerName;
            console.log("CHALLENR NAME BEFORE TOSTRING: " + challengerName);
            const challenger = await retrieveUserFromDataBaseByName(challengerName);
            console.log("CHALLENR BEFORE TOSTRING: " + challenger);
            const challengerToken = challenger.token;

            const challengedToken = data.challengedToken;
            const challenged = await retrieveUserFromDataBase(challengedToken);
            if (challenged === null) return;
            const challengedName = challenged.username;

            const challengerSocket = findSocketByName(challengerName, connectedSockets);
            const challengedSocket = findSocketByName(challengedName, connectedSockets);

            if (!challenged.friends.includes(challengerName)) {
                if (challengedSocket !== null) {
                    challengedSocket.emit('notFriendMessage', challengerName);
                }
            }
            else if (challengerSocket === null) {
                if (challengedSocket !== null) {
                    challengedSocket.emit('notConnectedMessage', challengerName);
                }
            }
            else {
                let matchID = challengerName + challengedName + getRandomNumber(0, 100000000000) + '';
                console.log("CHALLENR ID BEFORE TOSTRING: " + challenger._id);
                const matchInfo = {
                    player1: {
                        room: challengerToken + Math.floor(Math.random() * 100000000000000000),
                        userID: challenger._id.toString(),
                        username: challengerName,
                        token: challengerToken
                    },
                    player2: {
                        room: challengedToken + Math.floor(Math.random() * 100000000000000000),
                        userID: challenged._id.toString(),
                        username: challengedName,
                        token: challengedToken
                    },
                    board: createBoard(),
                    isFriendGame: true
                };

                firstPlayerName = challengerName;
                secondPlayerName = challengedName;

                mapGames.set(matchID, matchInfo);
                challengerSocket.join(matchID);
                challengedSocket.join(matchID);
                io.to(matchID).emit('challengeAccepted', matchID);
            }
        })

        socket.on('getPlayersNameToDisplay', () => {
            socket.emit('playersNameToDisplay', {
                firstPlayerName: firstPlayerName,
                secondPlayerName: secondPlayerName
            })
        });

        socket.on('IDeclineTheChallenge', async (data) => {
            let challengerName = data.challengerName;
            let challenger = await retrieveUserFromDataBaseByName(challengerName);
            let challengedToken = data.challengedToken;
            let challenged = await retrieveUserFromDataBase(challengedToken);
            if (challenged === null) return;
            findSocketByName(challenger.username, connectedSockets).emit('challengeDeclined', challenged.username);
        })

        socket.on('theChallengeIsCanceled', async (data) => {
            let challengerToken = data.challengerToken;
            let challenger = await retrieveUserFromDataBase(challengerToken);
            if (challenger === null) return;

            let challengedName = data.challengedName;
            let challengedSocket = findSocketByName(challengedName, connectedSockets);

            if (challengedSocket !== null) {
                challengedSocket.emit('challengeHasBeenCanceled', challenger.username);
            }
        })
    })
}

/**
 * Find a socket by its name
 * @param name the name of the socket
 * @param connectedSockets the list of connected sockets
 * @returns {null}
 */
function findSocketByName(name, connectedSockets) {
    let socketFound = null;

    for (const [key, socket] of connectedSockets) {
        if (socket.username === name) {
            socketFound = socket;
            break;
        }
    }
    return socketFound;
}

/**
 * Calculate the new Elo rating of a player
 * @param playerElo the current Elo rating of the player
 * @param opponentElo the current Elo rating of the opponent
 * @param didWin whether the player won or lost
 * @returns {number}
 */
function calculateNewElo(playerElo, opponentElo, didWin) {
    const kFactor = 45; // Elo rating system constant
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400)); // Calculate expected score based on Elo ratings
    const actualScore = didWin ? 1 : 0; // Determine actual score based on whether the player won or lost

    const newElo = playerElo + kFactor * (actualScore - expectedScore); // Calculate new Elo rating using Elo rating system formula

    return Math.round(newElo); // Round new Elo rating to nearest whole number
}

function createBoard() {
    return [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
    ];
}


/**
 * Check if a move is valid
 * @param moveToCheck the move to check
 * @returns {{winner: number, state: string}|{winner: (number|*), state: string}|{winner: string, state: string}}
 */
function checkMove(moveToCheck) {
    let board = moveToCheck.board
    let column = parseInt(moveToCheck.j);
    let line = parseInt(moveToCheck.i);
    console.log("colonne "+ column);
    console.log("line "+ line);

    const player = board[column][line];
    let count = 1;
    let j = line;
    while (j > 0 && board[column][j - 1] === player) {
        j--;
        count++;
    }
    j = line;
    while (j < board[column].length - 1 && board[column][j + 1] === player) {
        j++;
        count++;
    }
    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    // Check horizontal
    count = 1;
    let i = column;
    while (i > 0 && board[i - 1][line] === player) {
        i--;
        count++;
    }
    i = column;
    while (i < board.length - 1 && board[i + 1][line] === player) {
        i++;
        count++;
        console.log("LE I "+i);
        console.log("LE board "+board[i+1] );
    }
    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    // Check diagonal (top-left to bottom-right)

    count = 1;
    i = column;
    j = line;
    while (i > 0 && j > 0 && board[i - 1][j - 1] === player) {
        i--;
        j--;
        count++;
    }
    i = column;
    j = line;
    while (i < board.length - 1 && j < board[column].length - 1 && board[i + 1][j + 1] === player) {
        i++;
        j++;
        count++;
    }
    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    // Check diagonal (bottom-left to top-right)
    count = 1;
    i = column;
    j = line;
    while (i > 0 && j < board[column].length - 1 && board[i - 1][j + 1] === player) {
        i--;
        j++;
        count++;
    }
    i = column;
    j = line;
    while (i < board.length - 1 && j > 0 && board[i + 1][j - 1] === player) {
        i++;
        j--;
        count++;
    }

    if (count >= 4) return {
        state: "over",
        winner: moveToCheck.playerTurn
    };

    else if (checkDraw(board)) return {
        state: "over",
        winner: 0
    }

    return {
        state: "continue",
        winner: "None"
    }
}

/**
 * Check if the game is a draw
 * @param board
 * @returns {boolean}
 */
function checkDraw(board) {
    // Returns true if the board is full and there is no winner, false otherwise.
    for (let col = 0; col < 7; col++) {
        if (board[col][5] === 0) {
            return false;
        }
    }
    return true;
}

/**
 * Check if a move is illegal
 * @param board
 * @param column
 * @param playerTurn
 * @returns {boolean}
 */
function checkIllegalMove(board, column, playerTurn) {
    if (isColumnFull(board, column)) return true;
    else if (hasPlayedTwice(board, playerTurn)) return true;
    return false;
}

/**
 * Check if a column is full
 * @param board
 * @param column
 * @returns {boolean}
 */
function isColumnFull(board, column) {
    console.log("Illegal Move in Backend(full): " + (board[column][5] !== 0));
    return board[column][5] !== 0;
}

//player turn = 1 or -1
function hasPlayedTwice(board, playerTurn) {
    let sum = 0;
    for (let column = 0; column < 7; column++) {
        for (let line = 0; line < 6; line++) {
            sum += board[column][line];
        }
    }

    sum += playerTurn;
    console.log("Illegal Move in Backend(twice): " + (sum !== 0 || sum === 1));
    return !(sum === 0 || sum === 1);
}
function getRandomNumber(min, max) {
    // Calculate a random number between min and max, inclusive
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * add a win to the user in the database if he wins
 * @param requestFrom the user who won
 * @returns {Promise<void>}
 */
async function addWins(requestFrom){
    const collectionName = "log";
    try {
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const user = await collection.findOne({username: requestFrom});
        let userWins = user.wins + 1;
        await collection.updateOne({username: requestFrom}, {$set: {wins: userWins}});
    }
    catch (err) {
        console.error('Token not found', err);

    }
    finally {
        await client.close();
    }
}

/**
 * add a loss to the user in the database if he loses
 * @param requestFrom the user who lost
 * @returns {Promise<void>}
 */
async function addLosses(requestFrom){
    const collectionName = "log";
    try {
        console.log("ONE MORE LOST");
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const user = await collection.findOne({username: requestFrom});
        let userLosses = user.losses + 1;
        await collection.updateOne({username: requestFrom}, {$set: {losses: userLosses}});
    }
    catch (err) {
        console.error('Token not found', err);

    }
    finally {
        await client.close();
    }
}

/**
 * add a draw to the user in the database if he draws
 * @param requestFrom
 * @returns {Promise<void>}
 */
async function addDraws(requestFrom){
    const collectionName = "log";
    try {
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const user = await collection.findOne({username: requestFrom});
        let userDraws = user.draws + 1;
        await collection.updateOne({username: requestFrom}, {$set: {draws: userDraws}});
    }
    catch (err) {
        console.error('Token not found', err);
    }
    finally {
        await client.close();
    }
}

/**
 * update the elo of the user in the database after a game
 * @param requestFrom
 * @param elo the new elo
 * @returns {Promise<void>}
 */
async function addElo(requestFrom, elo){
    const collectionName = "log";
    try {
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        await collection.updateOne({username: requestFrom}, {$set: {elo: elo}});
    }
    catch (err) {
        console.error('Token not found', err);

    }
    finally {
        await client.close();
    }
}
exports.setUpSockets = setUpSockets;
