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
        //
    }
};