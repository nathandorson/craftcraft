var gameUpdateInterval;
import gameBoard from game.js

function main()
{
    gameWorld = gameBoard()
    gameUpdateInterval = setInterval(() => {
        updateGameWorld(gameWorld, inputs, players);
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