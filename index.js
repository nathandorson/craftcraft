var server = require("./server.js");

var gameUpdateInterval;

function main()
{
    server.run(game);
    gameUpdateInterval = setInterval(() => {
        gameWorld.update();
        server.update();
    }, 1000 / 60);
}

main();