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

var gameUpdateInterval;
var GameBoard = require("./game.js");

function main()
{
    if(express != null)
    {
        try
        {
            var webserver = express();
            webserver.use(express.static("public"));
            webserver.on("error", () => { console.log("web server error: " + e); })
            let port = 8080;
            webserver.listen(port, () => { console.log("web server running on port " + port); });
        }
        catch(e)
        {
            console.log("error starting web server: " + e);
        }
    }

    gameWorld = new GameBoard();
    server.run(gameWorld);
    gameUpdateInterval = setInterval(() => {
        gameWorld.update();
        server.update();
    }, 1000 / 60);
}
main();