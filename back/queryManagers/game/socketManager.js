const mongoDBConnection = require("../mongoDBConnection.js");
const gameManager = require("gameManager.js");

let roomInSearch = null;
const mapGames = new Map();

let firstPlayerName;
let secondPlayerName;
let playerStillInGameNumber;


/**
 * This function sets up the sockets and the connection to the database
 * @param io the socket.io object
 */
function setUpSockets(io) {
    try {
        let connectedSockets = io.sockets.sockets;
        io.on('connection', socket => {
            socketSearchMultiGame(socket, io);
            socketCancelQueue(socket, io);
            socketInitMulti(socket, io);
            socketChat(socket, io);
            socketFriendChat(socket, connectedSockets);
            socketFindAllMessagePending(socket, connectedSockets);
            socketLoadFriendChat(socket, connectedSockets);
            socketSetToRead(socket)
            socketPlayMulti(socket, io);
            socketTimeOver(socket, io);
            socketSurrender(socket, io);
            socketChallengeFriend(socket, connectedSockets);
            socketIAcceptTheChallenge(socket, io, connectedSockets);
            socketGetPlayerNameToDisplay(socket);
            socketIDeclineTheChallenge(socket, connectedSockets);
            socketChallengeIsDeclined(socket, connectedSockets)

            // Store the username linked to this socket
            socket.on('socketByUsername', function (data) {
                console.log("THIS USERNAME HAS LOGGED WITH SOCKET " + data.username)
                socket.username = data.username;
            });
        });
    } catch (error) {
        console.log("SOCKET ERROR: " + error);
    }
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

function socketSearchMultiGame(socket, io) {
    socket.on('searchMultiGame', async (player) => {
        let user = await mongoDBConnection.retrieveUserFromDataBase(player.token);
        let roomName = player.room;

        socket.join(roomName);
        io.to(roomName).emit('inQueue', null);

        if (roomInSearch == null) {
            roomInSearch = {
                room: player.room,
                userID: user._id.toString(),
                username: user.username,
                ready: false,
                elo: user.elo,
            }
        } else if (user._id.toString() !== roomInSearch.userID) {
            let matchID = gameManager.getRandomNumber(0, 100000000000) + '';
            const matchInfo = {
                player1: {
                    room: roomInSearch.room,
                    userID: roomInSearch.userID,
                    username: roomInSearch.username,
                    ready: false,
                    elo: roomInSearch.elo
                },
                player2: {
                    room: player.room,
                    userID: user._id.toString(),
                    username: user.username,
                    ready: false,
                    elo: user.elo
                },
                board: gameManager.createBoard(),
                isFriendGame: false
            };

            mapGames.set(matchID, matchInfo);
            io.to(roomInSearch.room).emit('matchFound', matchID);
            io.to(roomName).emit('matchFound', matchID);

            firstPlayerName = matchInfo.player1.username;
            secondPlayerName = matchInfo.player2.username;

            roomInSearch = null;
        }
    });
}

function socketCancelQueue(socket, io) {
    socket.on('cancelQueue', async (player) => {
        let user = await mongoDBConnection.retrieveUserFromDataBase(player.token);

        if (roomInSearch != null && roomInSearch.userID === user._id.toString()) {
            let roomName = roomInSearch.room;
            roomInSearch = null;
            io.to(roomName).emit('cancel');
        }
    });
}

function socketInitMulti(socket, io) {
    socket.on('initMulti', async (request) => {
        let gameInfo = mapGames.get(request.matchID);
        let user = await mongoDBConnection.retrieveUserFromDataBase(request.token);

        if (user._id.toString() === gameInfo.player1.userID) {
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
    });
}

function socketChat(socket, io) {
    socket.on('chat', async (request) => {
        let gameInfo = mapGames.get(request.matchID);
        let user = await mongoDBConnection.retrieveUserFromDataBase(request.token);

        if (user._id.toString() === gameInfo.player1.userID) {
            io.to(gameInfo.player2.room).emit('message', {
                username: gameInfo.player1.username,
                message: request.chat
            });
        } else if (user._id.toString() === gameInfo.player2.userID) {
            io.to(gameInfo.player1.room).emit('message', {
                username: gameInfo.player2.username,
                message: request.chat
            });
        }
    });
}

function socketFriendChat(socket, connectedSockets) {
    socket.on('friendChat', async (request) => {
        let heReads = false;
        let user = await mongoDBConnection.retrieveUserFromDataBase(request.token);
        let item = await mongoDBConnection.saveMessageToDataBase(user.username, request.friendUsername, request.chat, heReads);

        if (findSocketByName(request.friendUsername, connectedSockets) !== null) {
            findSocketByName(request.friendUsername, connectedSockets).emit('privateMessage', {
                username: user.username,
                message: request.chat,
                item: item
            });
        }
    });
}

function socketFindAllMessagePending(socket, connectedSockets) {
    socket.on('findAllMessagePending', async (request) => {
        let user = await mongoDBConnection.retrieveUserFromDataBase(request.token);
        let allUserMessages = await mongoDBConnection.loadAllMessagePending(user.username);
        findSocketByName(user.username, connectedSockets).emit('loadAllMessagePending', allUserMessages);
    });
}

function socketLoadFriendChat(socket, connectedSockets) {
    socket.on('loadFriendChat', async (request) => {
        let user = await mongoDBConnection.retrieveUserFromDataBase(request.token);
        let allUserMessages = await mongoDBConnection.loadAllMessageFromConversation(request.friendUsername, user.username);
        findSocketByName(user.username, connectedSockets).emit('allConversationPrivateMessages', allUserMessages)
    });
}

function socketSetToRead(socket, connectedSockets) {
    socket.on('setToRead', async (request) => {
        let to = await mongoDBConnection.retrieveUserFromDataBase(request.token);
        let updated = await mongoDBConnection.updateSetToRead();

        if (updated.modifiedCount > 0)
            findSocketByName(to.username, connectedSockets).emit('loadAllMessagePending', mongoDBConnection.loadAllMessagePending(to));
    })
}

function socketPlayMulti(socket, io) {
    socket.on('playMulti', async (request) => {
        let moveToCheck;
        let gameInfo = mapGames.get(request.matchID);
        let user = await mongoDBConnection.retrieveUserFromDataBase(request.token);

        if (user._id.toString() === gameInfo.player1.userID && !gameManager.checkIllegalMove(gameInfo.board, request.pos[0], 1)) {
            gameInfo.board[request.pos[0]][request.pos[1]] = 1;
            io.to(gameInfo.player2.room).emit('doMoveMulti', request.pos);
            moveToCheck = {
                board: gameInfo.board,
                playerTurn: 1,
                i: request.pos[1],
                j: request.pos[0],
            }
        } else if (user._id.toString() === gameInfo.player2.userID && !gameManager.checkIllegalMove(gameInfo.board, request.pos[0], -1)) {
            gameInfo.board[request.pos[0]][request.pos[1]] = -1;
            io.to(gameInfo.player1.room).emit('doMoveMulti', request.pos);
            moveToCheck = {
                board: gameInfo.board,
                playerTurn: -1,
                i: request.pos[1],
                j: request.pos[0],
            }
        } else {
            return;
        }

        let check = gameManager.checkMove(moveToCheck);
        if (check.state === "over") {
            if (check.winner === 1) {
                if (gameInfo.isFriendGame) {
                    io.to(gameInfo.player1.room).emit('win', null);
                    io.to(gameInfo.player2.room).emit('lose', null);

                    io.to(gameInfo.player1.room).emit('stopTimer', null);
                    io.to(gameInfo.player2.room).emit('stopTimer', null);
                } else {
                    let oldElo1 = gameInfo.player1.elo;
                    let oldElo2 = gameInfo.player2.elo;
                    let newElo1 = gameManager.calculateNewElo(gameInfo.player1.elo, gameInfo.player2.elo, 1)
                    await mongoDBConnection.addElo(gameInfo.player1.username, newElo1);
                    await mongoDBConnection.addWins(gameInfo.player1.username)
                    await mongoDBConnection.addLosses(gameInfo.player2.username)
                    let newElo2 = gameManager.calculateNewElo(gameInfo.player2.elo, gameInfo.player1.elo, 0)
                    await mongoDBConnection.addElo(gameInfo.player2.username, newElo2);
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

                await mongoDBConnection.addDraws(gameInfo.player1.username)
                await mongoDBConnection.addDraws(gameInfo.player2.username)
            } else {
                if (gameInfo.isFriendGame) {
                    io.to(gameInfo.player1.room).emit('lose', null);
                    io.to(gameInfo.player2.room).emit('win', null);

                    io.to(gameInfo.player1.room).emit('stopTimer', null);
                    io.to(gameInfo.player2.room).emit('stopTimer', null);
                } else {
                    let oldElo1 = gameInfo.player1.elo;
                    let oldElo2 = gameInfo.player2.elo;
                    let newElo2 = gameManager.calculateNewElo(gameInfo.player2.elo, gameInfo.player1.elo, 1);
                    await mongoDBConnection.addElo(gameInfo.player2.username, newElo2);
                    await mongoDBConnection.addWins(gameInfo.player2.username)
                    await mongoDBConnection.addLosses(gameInfo.player1.username)
                    let newElo1 = gameManager.calculateNewElo(gameInfo.player1.elo, gameInfo.player2.elo, 0)
                    await mongoDBConnection.addElo(gameInfo.player1.username, newElo1);
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
        } else {
            io.to(gameInfo.player1.room).emit('updateColor', null);
            io.to(gameInfo.player2.room).emit('updateColor', null);
            io.to(gameInfo.player1.room).emit('timerReset', null);
            io.to(gameInfo.player2.room).emit('timerReset', null);
        }
    });
}

function socketTimeOver(socket, io) {
    playerStillInGameNumber = 0;
    socket.on('timeOver', async (data) => {
        playerStillInGameNumber++;

        if (playerStillInGameNumber < 2) {
            let player = await mongoDBConnection.retrieveUserFromDataBase(data.token);
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
                let deltas = gameManager.updateElo(gameInfo, didPlayer1Win, didPlayer2Win);

                if (didPlayer1Win === 1) {
                    await mongoDBConnection.addWins(gameInfo.player1.username);
                    await mongoDBConnection.addLosses(gameInfo.player2.username);
                    io.to(losingPlayerRoom).emit('lose', deltas.delta2);
                    io.to(winningPlayerRoom).emit('win', deltas.delta1);
                } else {
                    await mongoDBConnection.addWins(gameInfo.player2.username);
                    await mongoDBConnection.addLosses(gameInfo.player1.username);
                    io.to(losingPlayerRoom).emit('lose', deltas.delta1);
                    io.to(winningPlayerRoom).emit('win', deltas.delta2);
                }
            }
        }
        playerStillInGameNumber = 0;
    });
}

function socketSurrender(socket, io) {
    socket.on('surrender', async (data) => {
        let surrenderedPlayer = await mongoDBConnection.retrieveUserFromDataBase(data.token);
        let surrenderedPlayerName = surrenderedPlayer.username;

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
            let deltas = gameManager.updateElo(gameInfo, didPlayer1Win, didPlayer2Win);

            if (didPlayer1Win === 1) {
                await mongoDBConnection.addWins(gameInfo.player1.username);
                await mongoDBConnection.addLosses(gameInfo.player2.username);
                io.to(losingPlayerRoom).emit('lose', deltas.delta2);
                io.to(winningPlayerRoom).emit('win', deltas.delta1);

                io.to(gameInfo.player1.room).emit('stopTimer', null);
                io.to(gameInfo.player2.room).emit('stopTimer', null);
            } else {
                await mongoDBConnection.addWins(gameInfo.player2.username);
                await mongoDBConnection.addLosses(gameInfo.player1.username);
                io.to(losingPlayerRoom).emit('lose', deltas.delta1);
                io.to(winningPlayerRoom).emit('win', deltas.delta2);

                io.to(gameInfo.player1.room).emit('stopTimer', null);
                io.to(gameInfo.player2.room).emit('stopTimer', null);
            }
        }
    });
}

function socketChallengeFriend(socket, connectedSockets) {
    socket.on('challengeFriend', async (request) => {
        let challengerToken = request.challengerToken;
        let challenger = await mongoDBConnection.retrieveUserFromDataBase(challengerToken);

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
    });
}

function socketIAcceptTheChallenge(socket, io, connectedSockets) {
    socket.on('IAcceptTheChallenge', async (data) => {
        const challengerName = data.challengerName;
        const challenger = await mongoDBConnection.retrieveUserFromDataBaseByName(challengerName);
        const challengerToken = challenger.token;

        const challengedToken = data.challengedToken;
        const challenged = await mongoDBConnection.retrieveUserFromDataBase(challengedToken);
        if (challenged === null) return;
        const challengedName = challenged.username;

        const challengerSocket = findSocketByName(challengerName, connectedSockets);
        const challengedSocket = findSocketByName(challengedName, connectedSockets);

        if (!challenged.friends.includes(challengerName)) {
            if (challengedSocket !== null) {
                challengedSocket.emit('notFriendMessage', challengerName);
            }
        } else if (challengerSocket === null) {
            if (challengedSocket !== null) {
                challengedSocket.emit('notConnectedMessage', challengerName);
            }
        } else {
            let matchID = challengerName + challengedName + gameManager.getRandomNumber(0, 100000000000) + '';
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
                board: gameManager.createBoard(),
                isFriendGame: true
            };

            firstPlayerName = challengerName;
            secondPlayerName = challengedName;

            mapGames.set(matchID, matchInfo);
            challengerSocket.join(matchID);
            challengedSocket.join(matchID);
            io.to(matchID).emit('challengeAccepted', matchID);
        }
    });
}

function socketGetPlayerNameToDisplay(socket) {
    socket.on('getPlayersNameToDisplay', () => {
        socket.emit('playersNameToDisplay', {
            firstPlayerName: firstPlayerName,
            secondPlayerName: secondPlayerName
        })
    });
}

function socketIDeclineTheChallenge(socket, connectedSockets) {
    socket.on('IDeclineTheChallenge', async (data) => {
        let challengerName = data.challengerName;
        let challenger = await mongoDBConnection.retrieveUserFromDataBaseByName(challengerName);
        let challengedToken = data.challengedToken;
        let challenged = await mongoDBConnection.retrieveUserFromDataBase(challengedToken);
        if (challenged === null) return;
        findSocketByName(challenger.username, connectedSockets).emit('challengeDeclined', challenged.username);
    })
}

function socketChallengeIsDeclined(socket, connectedSockets) {
    socket.on('theChallengeIsCanceled', async (data) => {
        let challengerToken = data.challengerToken;
        let challenger = await mongoDBConnection.retrieveUserFromDataBase(challengerToken);
        if (challenger === null) return;

        let challengedName = data.challengedName;
        let challengedSocket = findSocketByName(challengedName, connectedSockets);

        if (challengedSocket !== null) {
            challengedSocket.emit('challengeHasBeenCanceled', challenger.username);
        }
    })
}

exports.setUpSockets = setUpSockets;
