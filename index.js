var server = require("./server.js");

var gameUpdateInterval;
//import {gameBoard, game} from "game.js";
var gamejs = require("./game.js");
var GameBoard = gamejs.GameBoard;
var game = gamejs.game;

function main()
{
    gameWorld = new GameBoard();
    server.run(game);
    gameUpdateInterval = setInterval(() => {
        game.update(gameWorld);
        server.update();
    }, 1000 / 60);
}
main();