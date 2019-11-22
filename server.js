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
            let actionType = data["action"];
            let id = data["unit"];
            if(actionType == "move")
            {
                if(data.hasOwnProperty("target"))
                {
                    let target = data["target"];
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
                let target = data["target"];
                cl.player.attack(id, target);
            }
            else if(actionType == "harvest")
            {
                let target = data["target"];
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
        cl.player = game.requestPlayer();
    }
};
class ConnectedClient
{
    constructor(socket)
    {
        this.socket = socket;
        this.targetPlayer = -1;
        this.player = null;
    }
    update()
    {

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
                receivedActions[dataObj.type](client, )
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