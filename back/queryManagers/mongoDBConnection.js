
const MongoClient = require('mongodb').MongoClient;
//url to connect to the database
const url = 'mongodb://admin:b0ttle0fW4t3r@mongodb/admin?directConnection=true';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

/**
 * This function log in the user in the database and change the token
 * @param response
 * @param currentUser user to log in
 * @param collectionName name of the collection to use here its log
 * @returns {Promise<void>}
 */
async function loginInDataBase(response,currentUser,collectionName) {
    try {
        const jwt = require('jsonwebtoken');
        const secret = 'secretKeyyyy';

        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        console.log(currentUser);
        const item = await collection.findOne(currentUser);
        if(item === null) {
            console.log("Invalid credentials!");
            return;
        }

        console.log("ITEM FROM MONGODB:" + item);
        const token = jwt.sign({userId: item._id, name: item.name}, secret);

        await collection.updateOne(
            {username: item.username},
            { $set: { token: token } }
        );
        let newItem = await collection.findOne({token:token});
        console.log("NEW ID ")
        if(newItem === null) {
            console.log("No user with this ID!");
            return;
        }
        response.writeHead(200, {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token});
        response.end(JSON.stringify(newItem));
        console.log("THIS IS THE TOKEN:"+token);

    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'failure' }));
    } finally {
        await client.close();
    }
}

/**
 * This function create a new user in the database
 * @param response
 * @param valueToFind value to find in the database
 * @param collectionName name of the collection to use here its log
 * @param verifValue value to verify if the user already exist
 * @returns {Promise<void>}
 */

async function createInDataBase(response,valueToFind,collectionName,verifValue) {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        const collection = db.collection(collectionName);
        const item = await collection.findOne(verifValue);
        if (item!=null) {
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({status: 'failure'}));
        }
        else{
            const result = await collection.insertOne(valueToFind);
            console.log('Document inserted', result.insertedId);
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({ status: 'success' }));
        }
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'failure' }));
    } finally {
        await client.close();
    }
}

/**
 * This function find everything in the database that match the valueToFind
 * @param response
 * @param valueToFind value to find in the database
 * @param collectionName name of the collection to use here its log
 * @returns {Promise<void>}
 */

async function findEverythingInDataBase(response,valueToFind,collectionName){
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db("connect4");
        //await db.addUser("admin", "admin", {roles: [{role: "readWrite", db: "connect4"}]});
        const collection = db.collection(collectionName);
        const items = await collection.find(valueToFind).toArray();
        console.log(items);
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(items));
    } catch (err) {
        console.error('Failed to create database or user', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'failure' }));
    } finally {
        await client.close();
    }
}

/**
 * this function add a friend request to a user in the database
 * @param response
 * @param requestFrom user who does the request
 * @param valueToInsert friend to add
 * @returns {Promise<void>}
 */

async function  friendRequest(response, requestFrom, valueToInsert) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the friend to add
        const friendItem = await collection.findOne({username: valueToInsert});

        // user not found security
        if (friendItem === null) {
            response.end(JSON.stringify({ status: 'User not found' }));
            return;
        }

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        if(user === null) {
            console.log("No user with this ID!");
            return;
        }
        let userRequest = user.requestSent;
        let userFriends = user.friends;
        let userRequestReceived = user.requestReceived;

        // security to avoid spam request or to add a friend the user already has or add oneself
        if (userRequest.includes(valueToInsert) || userFriends.includes(valueToInsert) || valueToInsert === user.username) {
            return;
        }

        // if both the users ask each other, they automatically accept each other
        if (userRequestReceived.includes(valueToInsert)) {
            await acceptFriendRequest(response, requestFrom, valueToInsert);
        }

        // adding the friend request in the user database
        userRequest.push(valueToInsert);
        await collection.updateOne({token: requestFrom}, {$set: {requestSent: userRequest}});

        // send the friend request to the friend
        let friendRequestReceived = friendItem.requestReceived;
        friendRequestReceived.push(user.username);
        await collection.updateOne({username: friendItem.username}, {$set: {requestReceived: friendRequestReceived}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

/**
 * Retrieve the friend list of a user
 * @param response the response to send
 * @param requestFrom the user who does the request
 * @returns {Promise<void>}
 */
async function retrieveFriendList(response, requestFrom) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        if(user === null) {
            console.log("No user with this ID!");
            return;
        }
        let userFriends = user.friends;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(userFriends));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

/**
 * Retrieve all the stats of a user (elo, win, lose, draw)
 * @param response
 * @param requestFrom user who does the request
 * @param friendName friendName because we use this function to see the stats of a friend
 * @returns {Promise<void>}
 */
async function retrieveAllStats(response, requestFrom,friendName){
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);


        let user;
        let userRequest =  await collection.findOne({token: requestFrom});
        if(userRequest === null) {
            console.log("No user with this ID!");
            return;
        }
        if(friendName === userRequest.username){
              user = userRequest;
        }else{
            if(!userRequest.friends.includes(friendName)){
                response.writeHead(404, {'Content-Type': 'application/json'});
                response.end(JSON.stringify({status: 'failure'}));
                return;
            }
            user = await collection.findOne({username: friendName});
        }
        // finding the user who does the request
        const userElo = user.elo;
        const userWins = user.wins;
        const userLosses = user.losses;
        const userDraws = user.draws;
        const nbFriends = user.friends.length;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({eloPlayer: userElo, wins: userWins, losses: userLosses, draws: userDraws, nbFriends: nbFriends}));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

/**
 * Remove a friend from the friend list of a user
 * @param response
 * @param requestFrom user who does the request
 * @param friendToRemove friend to remove
 * @returns {Promise<void>}
 */
async function removeFriend(response, requestFrom, friendToRemove) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user who does the request
        const user = await collection.findOne({token: requestFrom});
        if(user === null) {
            console.log("No user with this ID!");
            return;
        }
        const friend = await collection.findOne({username: friendToRemove});
        let userFriends = user.friends;
        let friendFriends = friend.friends;

        // finding and removing the friend to remove
        for (let i = 0; i < userFriends.length; i++) {
            if (userFriends[i] === friendToRemove) {
                userFriends.splice(i, 1);
                break;
            }
        }

        for (let i = 0; i < friendFriends.length; i++) {
            if (friendFriends[i] === user.username) {
                friendFriends.splice(i, 1);
                break;
            }
        }

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {friends: userFriends}});
        await collection.updateOne({username: friendToRemove}, {$set: {friends: friendFriends}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

/**
 * retrieve the friends requests of a user
 * @param response
 * @param requestFrom user who does the request
 * @returns {Promise<void>}
 */

async function retrieveFriendRequest(response, requestFrom) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user and its received friends requests
        const user = await collection.findOne({token: requestFrom});
        if(user === null) {
            console.log("No user with this ID!");
            return;
        }
        let userFriendRequests = user.requestReceived;

        // answer the data
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(userFriendRequests));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

/**
 * Accept a friend request
 * @param response
 * @param requestFrom user who does the request
 * @param friendToAccept friend to accept
 * @returns {Promise<void>}
 */

async function  acceptFriendRequest(response, requestFrom, friendToAccept) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user and the friend
        const user = await collection.findOne({token: requestFrom});
        if(user === null) {
            console.log("No user with this ID!");
            return;
        }
        const friend = await collection.findOne({username: friendToAccept});

        // adding each other as friend
        let userFriendList = user.friends;
        let friendFriendList = friend.friends;
        userFriendList.push(friend.username);
        friendFriendList.push(user.username);

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {friends: userFriendList}});
        await collection.updateOne({username: friendToAccept}, {$set: {friends: friendFriendList}});

        // removing the received and sent requests
        let userRequestReceived = user.requestReceived;
        for (let i = 0; i < userRequestReceived.length; i++) {
            if (userRequestReceived[i] === friend.username) {
                userRequestReceived.splice(i, 1);
                break;
            }
        }

        let friendRequestSent = friend.requestSent;
        for (let i = 0; i < friendRequestSent.length; i++) {
            if (friendRequestSent[i] === user.username) {
                friendRequestSent.splice(i, 1);
                break;
            }
        }

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {requestReceived: userRequestReceived}});
        await collection.updateOne({username: friendToAccept}, {$set: {requestSent: friendRequestSent}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

/**
 * Decline a friend request
 * @param response
 * @param requestFrom user who does the request (the one who received the request)
 * @param friendToDecline friend to decline
 * @returns {Promise<void>}
 */
async function  declineFriendRequest(response, requestFrom, friendToDecline) {
    const collectionName = "log";
    try {
        // database connection
        await client.connect();
        const db = client.db("connect4");
        const collection = db.collection(collectionName);

        // finding the user and the friend
        const user = await collection.findOne({token: requestFrom});
        if(user === null) {
            console.log("No user with this ID!");
        }
        const friend = await collection.findOne({username: friendToDecline});

        // removing the received and sent requests
        let userRequestReceived = user.requestReceived;
        for (let i = 0; i < userRequestReceived.length; i++) {
            if (userRequestReceived[i] === friend.username) {
                userRequestReceived.splice(i, 1);
                break;
            }
        }

        let friendRequestSent = friend.requestSent;
        for (let i = 0; i < friendRequestSent.length; i++) {
            if (friendRequestSent[i] === user.username) {
                friendRequestSent.splice(i, 1);
                break;
            }
        }

        // update database
        await collection.updateOne({token: requestFrom}, {$set: {requestReceived: userRequestReceived}});
        await collection.updateOne({username: friendToDecline}, {$set: {requestSent: friendRequestSent}});

        // response
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: 'success' }));

    } catch (err) {
        console.error('Token not found', err);
        response.writeHead(400, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({status: 'failure'}));
    } finally {
        await client.close();
    }
}

// here we exports all the functions to be used in other files
exports.findInDataBase = loginInDataBase;
exports.createInDataBase = createInDataBase;
exports.findEverythingInDataBase = findEverythingInDataBase;

exports.friendRequest = friendRequest;
exports.retrieveFriendList = retrieveFriendList;
exports.removeFriend = removeFriend;
exports.retrieveFriendRequest = retrieveFriendRequest;
exports.acceptFriendRequest = acceptFriendRequest;
exports.declineFriendRequest = declineFriendRequest;
exports.retrieveAllStats = retrieveAllStats;


