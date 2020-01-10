"use strict";
var WebSocket = require("ws");
var Entity = require("./entity.js");
var wsServer;
var game;
var port = 5524;
var clientList;
var receivedActions = {
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
            }
            else if(actionType == "build")
            {
                let buildingType = data["building"];
                let tx = data["x"];
                let ty = data["y"];
                cl.player.build(id, buildingType, tx, ty);
            }
        }
    },
    join: function(cl, data) {
        cl.setPlayer(game.requestPlayer(game));
        let entityList = game.getEntityList(cl.player, false);
        for(let i = 0; i < entityList.length; i++)
        {
            cl.player.emitter.emit("create", entityList[i], false);
        }
        // if(clientList.length == 0){
        //     cl.player.addEntity(new Entity("house", game.requestId(), mapSideLength - 300, 300, 1, game, cl.player));
        // } else {
        //     cl.player.addEntity(new Entity("house", game.requestId(), 300, mapSideLength - 300, 1, game, cl.player));
        // }
    },
    createUnit: function(cl, data) {
        let x = data.x;
        let y = data.y;
        let entityType = data.entityType;
        let id = game.requestId();
        let cellx = Math.floor(x / game.tileSideLength);
        let celly = Math.floor(y / game.tileSideLength);
        let z;
        if(cellx >= game.map.length || cellx < 0 || celly >= game.map[cellx].length || celly < 0)
        {
            return; // just dont make it outside of the map
        }
        else
        {
            z = game.map[cellx][celly].height;
        }
        let entity = new Entity(entityType, id, x, y, z, game, cl.player);
        if(!game.checkCollision(entity))
        {
            cl.player.addEntity(entity);
        }
    }
};
function broadcast(strMessage)
{
    for(let i = 0; i < clientList.length; i++)
    {
        clientList[i].socket.send(strMessage);
    }
}
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
class ConnectedClient
{
    constructor(socket)
    {
        this.socket = socket;
        this.targetPlayer = -1;
        this.player = null;
        this.queuedUpdates = [];
        this.createUnit = (unit, sendToAll, player) => {
            //send create event to client
            // if(typeof send !== "function") send = broadcast;
            // send(JSON.stringify(getUnitCreationInformation(unit, player)));
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
                
            }
        };
        this.updateUnit = (unit, send, player) => { //only update if friendly unit or close to friendly unit
            //send updated information to client
            if(typeof send !== "function") send = broadcast;
            send(JSON.stringify({
                type: "updateEntity",
                id: unit.id,
                x: unit.x,
                y: unit.y,
                z: unit.z,
                state: unit.state
            }));
        };
        this.destroyUnit = (unit, sendToAll) => {
            //tell client unit is no more
            let data = JSON.stringify({
                type: "destroyEntity",
                id: unit.id
            });
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
        this.updateResources = (amt, sendToAll) => {
            //tell client to update resource amount
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
    update()
    {

    }
    setPlayer(player)
    {
        this.player = player;
        player.emitter.on("create", (unit, sendToAll, tplayer) => {
            if(typeof tplayer === "undefined") tplayer = player;
            if(typeof sendToAll === "undefined") sendToAll = false;
            this.createUnit(unit, sendToAll, tplayer);
        });
        player.emitter.on("update", this.updateUnit);
        player.emitter.on("destroy", this.destroyUnit);
        player.emitter.on("resource", this.updateResources);
        this.sendWorld();
    }
    sendWorld()
    {
        this.socket.send(JSON.stringify({
            type: "sendMap",
            worldMap: game.map
        }));
    }
    destroy()
    {
        let entityList = game.getEntityList(this.player, true);
        for(let i = entityList.length - 1; i >= 0; i--)
        {
            let entity = entityList[i];
            if(entity.owner == this.player)
            {
                entityList.splice(i, 1);
                console.log("destroying entity id " + entity.id);
            }
        }
        game.removePlayer(this.player);
        console.log("removed player");
        clientList.splice(clientList.indexOf(this), 1);
        console.log("removed client");
    }
}
module.exports = {
    run: function(g)
    {
        game = g;
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
                console.log(dataObj);
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
    update: function()
    {
        for(let i = 0; i < clientList.length; i++)
        {
            clientList[i].update();
        }
    }
};