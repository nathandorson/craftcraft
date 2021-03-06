"use strict";
var WebSocket = require("ws");
var Entity = require("./entity.js");
/**
 * web socket server
 */
var wsServer;
/**
 * reference to the game
 */
var game;
/**
 * web socket server port
 */
var port = 5524;
/**
 * list of clients
 */
var clientList;
/**
 * when someone wins, call this
 */
var winCallback;
/**
 * functions to call when we receive a specific action from the client
 */
var receivedActions = {
    /**
     * the client has told us to do something with an entity
     * @param {ConnectedClient} cl the client
     * @param {object} data data from client
     */
    doAction: function(cl, data) {
        if(cl.player != null)
        {
            let actionType = data["actionType"];
            let id = data["id"];
            if(actionType == "move")
            {
                if(data.hasOwnProperty("targetId"))
                {
                    let targetId = data["targetId"];
                    let target = game.findEntityByID(targetId);
                    cl.player.move(id, target);
                }
                else
                {
                    let tx = data["x"];
                    let ty = data["y"];
                    cl.player.move(id, tx, ty);
                }
            }
            else if(actionType == "attack")
            {
                let targetId = data["targetId"];
                let target = game.findEntityByID(targetId);
                cl.player.attack(id, target);
            }
            else if(actionType == "harvest")
            {
                let targetId = data["targetId"];
                let target = game.findEntityByID(targetId);
                cl.player.harvest(id, target);
            }/*
            else if(actionType == "build")
            {
                let buildingType = data["building"];
                let tx = data["x"];
                let ty = data["y"];
                cl.player.build(id, buildingType, tx, ty);
            }*/
        }
    },
    /**
     * the client has requested to join the game
     * @param {ConnectedClient} cl the client
     * @param {*} data data from client
     */
    join: function(cl, data) {
        if(data.hasOwnProperty("name"))
        {
            let name = data["name"];
            cl.name = name;
        }
        else
        {
            cl.name = "unnamed client";
        }
        cl.setPlayer(game.requestPlayer());
        let entityList = game.getEntityList(cl.player, false);
        for(let i = 0; i < entityList.length; i++)
        {
            cl.player.emitter.emit("create", entityList[i], false);
        }
    },
    /**
     * the client wants to create a unit
     * @param {ConnectedClient} cl the client
     * @param {*} data data from client
     */
    createUnit: function(cl, data) {
        let x = data.x;
        let y = data.y;
        let entityType = data.entityType;
        let id = game.requestId();
        let cellx = Math.floor(x / game.tileSideLength);
        let celly = Math.floor(y / game.tileSideLength);
        let z;
        console.log(cellx);
        if(cellx >= game.map.length || cellx < 0 || celly >= game.map[cellx].length || celly < 0)
        {
            return; // just dont make it outside of the map
        }
        else
        {
            z = game.map[cellx][celly].height;
        }
        let entity = new Entity(entityType, id, x, y, z, game, cl.player);
        if(game.checkCollision(entity).length == 0)
        {
            cl.player.addEntity(entity);
        }
    }
};
/**
 * broadcasts a string to all of the clients
 * @param {string} strMessage data to broadcast
 */
function broadcast(strMessage)
{
    for(let i = 0; i < clientList.length; i++)
    {
        clientList[i].socket.send(strMessage);
    }
}
/**
 * gets information about a unit to send to the client
 * @param {Entity} unit the unit
 * @param {Player} player the player
 */
function getUnitCreationInformation(unit, player)
{
    return {
        type: "createEntity",
        id: unit.id,
        x: unit.x,
        y: unit.y,
        z: unit.z,
        unitType: unit.type,
        isFriendly: unit.owner == player
    };
}
/**
 * The class for a client allows the server to keep track of the different players connected to the game
 * and send them updates to the state of the game so everyone knows what is going on
 */
class ConnectedClient
{
    /**
     * creates a new connected client
     * @param {WebSocket} socket the client's websocket
     */
    constructor(socket)
    {
        /**
         * name of this client specified by the client
         */
        this.name = "";
        /**
         * socket for the client
         */
        this.socket = socket;
        /**
         * the corresponding player in the game
         */
        this.player = null;
        /**
         * Sends information about the creation of a new entity to the client
         */
        this.createUnit = (unit, sendToAll, player) => {
            //send create event to client
            if(sendToAll)
            {
                for(let i = 0; i < clientList.length; i++)
                {
                    let client = clientList[i];
                    let targetPlayer = client.player;
                    if(player == null) targetPlayer = null;
                    client.socket.send(JSON.stringify(getUnitCreationInformation(unit, targetPlayer)));
                }
            }
            else
            {
                this.socket.send(JSON.stringify(getUnitCreationInformation(unit, this.player)));
                if(typeof unit.id === "undefined") debugger;
            }
        };
        /**
         * Sends information about the updated position and action of an entity to the client
         */
        this.updateUnit = (unit, sendToAll) => { //only update if friendly unit or close to friendly unit
            //send updated information to client
            let data;
            try
            {
                data = JSON.stringify({
                    type: "updateEntity",
                    id: unit.id,
                    x: unit.x,
                    y: unit.y,
                    z: unit.z,
                    state: unit.state
                });
            }
            catch(e)
            {
                debugger;
            }
            if(sendToAll)
            {
                for(let i = 0; i < clientList.length; i++)
                {
                    let client = clientList[i];
                    client.socket.send(data);
                }
            }
            else
            {
                this.socket.send(data);
            }
        };
        /**
         * Lets the client know that a unit has been destroyed (and specifies which unit)
         */
        this.destroyUnit = (unit, sendToAll) => {
            //tell client unit is no more
            let id;
            if(typeof unit === "number")
            {
                id = unit;
            }
            else
            {
                id = unit.id;
            }
            let data;
            try
            {
                data = JSON.stringify({
                    type: "destroyEntity",
                    id: id
                });
            }
            catch(e)
            {
                debugger;
            }
            if(sendToAll)
            {
                for(let i = 0; i < clientList.length; i++)
                {
                    let client = clientList[i];
                    client.socket.send(data);
                }
            }
            else
            {
                this.socket.send(data);
            }
        };
        /** 
         * Tells the client how many resources they now have
         */
        this.updateResources = (amt, sendToAll) => {
            let data = JSON.stringify({
                type: "updateResources",
                amount: amt
            });
            if(sendToAll)
            {
                for(let i = 0; i < clientList.length; i++)
                {
                    clientList[i].socket.send(data);
                }
            }
            else
            {
                this.socket.send(data);
            }
        };
    }
    /**
     * Updates the client about all relevant entities
     */
    update()
    {
        if(this.player != null)
        {
            let entities = this.player.getUpdatedEntities();
            for(let j = 0; j < entities.length; j++)
            {
                this.updateUnit(entities[j], false);
            }
        }
    }
    /**
     * Links a player to the client. The player object contains more game specific information,
     * while the client object is used primarily for communication
     */
    setPlayer(player)
    {
        this.player = player;
        player.emitter.on("create", (unit, sendToAll, tplayer) => {
            if(typeof tplayer === "undefined") tplayer = player;
            if(typeof sendToAll === "undefined") sendToAll = false;
            this.createUnit(unit, sendToAll, tplayer);
        });
        //player.emitter.on("update", this.updateUnit);
        player.emitter.on("destroy", this.destroyUnit);
        player.emitter.on("resource", this.updateResources);
        this.sendWorld();
    }
    /**
     * Sends the world to the connected client
     */
    sendWorld()
    {
        this.socket.send(JSON.stringify({
            type: "sendMap",
            worldMap: game.map
        }));
    }
    /**
     * Removes the client and player from the game
     */
    destroy()
    {
        if(this.player != null)
        {
            this.player.destroy();
        }
        else
        {
            console.log("player was null for some reason when trying to destroy it")
        }
        clientList.splice(clientList.indexOf(this), 1);
        console.log("removed client");
    }
}
module.exports = {
    /**
     * starts the server
     * @param {GameBoard} g a reference to the game world
     */
    run: function(g, winCb)
    {
        game = g;
        game.emitter.on("win", (player) => {
            for(let i = 0; i < clientList.length; i++)
            {
                if(clientList[i].player == player)
                {
                    let client = clientList[i];
                    winCallback(client.name);
                    break;
                }
            }
        });
        winCallback = winCb;
        clientList = [];
        wsServer = new WebSocket.Server({ port: port }, () => { console.log("game server running on port " + port); });
        wsServer.on("connection", (socket, req) => {
            var client = new ConnectedClient(socket);
            clientList.push(client);
            console.log("client connected from " + req.socket.remoteAddress + " :" + req.socket.remotePort);
            socket.on("close", (code, reason) => {
                console.log("client disconnected from " + req.socket.remoteAddress + " :" + req.socket.remotePort);
                client.destroy();
            });
            socket.on("message", (data) => {
                let dataObj = JSON.parse(data);
                let outStr = dataObj.type + "{";
                for(let prop in dataObj)
                {
                    if(prop != "type")
                    {
                        let item = dataObj[prop];
                        if(typeof item === "string")
                        {
                            item = "\"" + item + "\"";
                        }
                        outStr += prop + ":" + item + " ";
                    }
                }
                outStr += "}";
                console.log(outStr);
                if(receivedActions.hasOwnProperty(dataObj.type))
                {
                    receivedActions[dataObj.type](client, dataObj);
                }
                else
                {
                    console.log("invalid packet message type " + dataObj.type);
                }
            });
        });
    },
    /**
     * has the server update for a tick
     */
    update: function()
    {
        for(let i = 0; i < clientList.length; i++)
        {
            clientList[i].update();
        }
    }
};