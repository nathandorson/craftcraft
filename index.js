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
        //updateGameWorld(gameWorld, inputs, players);
        server.update();
    }, 1000 / 60);
}

function updateGameWorld(gameWorld, inputs, players){
    p1 = players[0]
    p2 = players[1]
    for(var i = 0; i++; i < inputs.length()){
        gameWorld.updateEnt(inputs[i]);
    }
    //updateClient
}

main();