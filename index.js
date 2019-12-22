var server = require("./server.js");

var gameUpdateInterval;
var GameBoard = require("./game.js");

function main()
{
    gameWorld = new GameBoard();
    server.run(gameWorld);
    gameUpdateInterval = setInterval(() => {
        gameWorld.update();
        server.update();
    }, 1000 / 60);
}
main();