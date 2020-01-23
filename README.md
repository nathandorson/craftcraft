# craftcraft

files also available at https://github.com/nathandorson/craftcraft

made by Forrest DeLay, Nathaniel Dorson, and Alan
The idea of the project is to create a game iwth a similar idea to StarCraft or other RTS games.
There are 4 different types of units: caves, workers, fighters, and houses
Caves are not owned by anyone, but they are used by workers to harvest resources for the player.
Workers gather resources. Fighters fight enemy units (and caves)
Houses let you create fighters and workers.
The game is won when a player has no more houses left.

how to run:
you need NodeJS (with npm), and a browser to run the client code
before running the server, run "npm install" in a terminal
to run the server, run "node index.js" in the same directory as the project's index.js
if connecting with a human client, go to public/address.js file and make sure the address variable is set to "ws://{server ip}:5524" (if running server on same computer as client, you can do something like "ws://127.0.0.1:5524")
