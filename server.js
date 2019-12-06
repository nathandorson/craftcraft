"use strict";
var WebSocket = require("ws");

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
                if(data.hasOwnProperty("target"))
                {
                    let targetId = data["target"];
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
                let targetId = data["target"];
                let target = game.findEntityByID(targetId);
                cl.player.attack(id, target);
            }
            else if(actionType == "harvest")
            {
                let targetId = data["target"];
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
        let entityList = game.getEntityList();
        for(let i = 0; i < entityList.length; i++)
        {
            cl.createUnit(entityList[i]);
        }
    },
    createUnit: function(cl, data) {
        let x = data.x;
        let y = data.y;
        let entityType = data.entityType;
        let id = game.requestId();
        let z = game.getMap()[Math.floor(x / game.getSideLength())][Math.floor(y / game.getSideLength())].height;
        let entity = new game.Entity(entityType, id, x, y, z, game, cl.player);
        cl.player.addEntity(entity);
    }
};
class ConnectedClient
{
    constructor(socket)
    {
        this.socket = socket;
        this.targetPlayer = -1;
        this.player = null;
        this.queuedUpdates = [];
        this.createUnit = (unit) => {
            //send create event to client
            this.socket.send(JSON.stringify({
                type: "createEntity",
                id: unit.id,
                x: unit.x,
                y: unit.y,
                z: unit.z,
                unitType: unit.type,
                isFriendly: unit.owner == this
            }));
        };
        this.updateUnit = (unit) => {
            //send updated information to client
            this.socket.send(JSON.stringify({
                type: "updateEntity",
                id: unit.id,
                x: unit.x,
                y: unit.y,
                z: unit.z,
                state: unit.state
            }));
        };
        this.destroyUnit = (unit) => {
            //tell client unit is no more
            this.socket.send(JSON.stringify({
                type: "destroyEntity",
                id: unit.id
            }));
        };
    }
    update()
    {

    }
    setPlayer(player)
    {
        this.player = player;
        player.emitter.on("create", this.createUnit);
        player.emitter.on("update", this.updateUnit);
        player.emitter.on("destroy", this.destroyUnit);
        this.sendWorld();
    }
    sendWorld()
    {
        this.socket.send(JSON.stringify({
            type: "sendMap",
            worldMap: game.getMap()
        }));
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
            console.log("client connected");
            socket.on("close", (code, reason) => {
                console.log("client disconnected");
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