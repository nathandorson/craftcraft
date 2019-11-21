var WebSocket = require("ws");

var gameUpdateInterval;

gameUpdateInterval = setInterval(() => {
    gameWorld.update();
}, 1000 / 60);