var server = require("./server.js");
var express = null;
try
{
    express = require("express");
}
catch(e)
{
    console.log("express not installed; recommended for web server");
}

var GameBoard = require("./game.js");
/**
 * main loop
 */
var gameUpdateInterval;

/**
 * beginning of program
 */
function main()
{
    //try to run webserver
    if(express != null)
    {
        try
        {
            var webserver = express();
            webserver.use(express.static("public"));
            webserver.on("error", () => { console.log("web server error: " + e); })
            let port = 8080;
            webserver.listen(port, () => { console.log("web server running on http://127.0.0.1:" + port + "/game.html"); });
        }
        catch(e)
        {
            console.log("error starting web server: " + e);
        }
    }
    //create game world
    gameWorld = new GameBoard();
    //start server
    server.run(gameWorld);
    //start game loop
    gameUpdateInterval = setInterval(() => {
        gameWorld.update();
        server.update();
    }, 1000 / 60); //60 tps
}
main();