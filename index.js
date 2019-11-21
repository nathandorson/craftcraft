var gameUpdateInterval;

function main()
{
    gameUpdateInterval = setInterval(() => {
        gameWorld.update();
    }, 1000 / 60);
}

main();