var worldSurface = null, lightSurface = null, shadowSurface = null;
var entitySurfaces = {};
var entityList = []; //the list of all entities that this client knows about
var friendlyEntityList = []; //the list of entities that this client controls
var selectedEntities = []; //the list of entities that the client currently has selected in order to move them or give them a command
var mapSideLength = 1024, tileSideLength = 64; //the size of the game world, and the size of each differently colored tile in the world
var worldMap = []; //a two dimensional array of tiles that is used to represent the world
var lightDiameter = 200; //how far entities push back the shadows, allowing sight for the client
var buildRadius = 100; //how far away from houses the client can build
var resources = 30; // the number of resources this client owns
var gameWidth = 640, gameHeight = 640; //the size of the screen
var controlButtonPressed = false, shiftButtonPressed = false;
var ws = null;
var fWorkers = 0;
var fFighters = 0;
var fHouses = 0;
var eWorkers = 0;
var eFighters = 0;
var eHouses = 0;
var ticks = 0;
var houseCoords = [];

class Entity
{
    constructor(type, id, isFriendly, x, y, z)
    {
        /**
         * type of entity
         */
        this.type = type;
        /**
         * id of entity
         */
        this.id = id;
        /**
         * if the entity is friendly
         */
        this.isFriendly = isFriendly;
        /**
         * x position of entity
         */
        this.x = x;
        /**
         * y position of entity
         */
        this.y = y;
        /**
         * height of entity
         */
        this.z = z;
        /**
         * outline color of this entity
         */
        this.outlineColor = [0, 0, 0];
        /**
         * outline width of this entity
         */
        this.outlineWidth = 1;
        /**
         * default radius of entity
         */
        this.radius = 10;
        this.targeting = false;

        //find and set type specific info about entity
        let info = entityInfo[this.type];
        for(let prop in info)
        {
            this[prop] = info[prop];
        }
    }
}

function findEntityByID(id, remove=false)
{
    for(let i = 0; i < entityList.length; i++)
    {
        let entity = entityList[i];
        if(entity.id == id)
        {
            if(remove)
            {
                return entityList.splice(i,1);
            }
            return entity;
        }
    }
    return null;
}

function changeEntNums(ent, changeType){
    var t = ent.type
    if(ent.isFriendly){
        if(t == "worker"){
            fWorkers += -1;
        }
        if(t == "fighter"){
            fFighters += -1;
        }
        if(t == "house"){
            fHouses += -1;
        }
    }
    else{
        if(t == "worker"){
            eWorkers += -1;
        }
        if(t == "fighter"){
            eFighters += -1;
        }
        if(t == "house"){
            eHouses += -1;
        }
    }
}

//useful information about each of the different entity types and how they are represented
var entityInfo = {
    worker: {
        radius: 5,
        friendlyColor: [255, 255, 255],
        opposingColor: [180, 180, 180]
    },
    fighter: {
        radius: 7,
        friendlyColor: [255, 0, 0],
        opposingColor: [155, 0, 0]
    },
    house: {
        radius: 20,
        friendlyColor: [150, 150, 150],
        opposingColor: [75, 75, 75]
    },
    cave: {
        radius: 15,
        friendlyColor: [255, 255, 255],
        opposingColor: [255, 255, 255]
    }
}

function connect(target)
{
    if(ws != null)
    {
        ws.close();
    }
    ws = new WebSocket(target);
    //when a connection is opened the client sends a JSON object to the server saying that they have connected
    ws.onopen = function() {
        console.log("connected to " + target);
        ws.send(JSON.stringify({
            type: "join",
            name: "a's ai"
        }));
        connected = true;
    };
    //when a connection is closed the game basically stops
    ws.onclose = function() {
        console.log("disconnected from " + target);
        connected = false;
        entityList = [];
        friendlyEntityList = [];
        selectedEntities = [];
        worldMap = [];
    };
    //when the client recieves a message from the server, they will do stuff with it based on what it is
    ws.onmessage = function(ev) {
        let data = JSON.parse(ev.data);
        if(typeof receivedActions[data.type] !== "undefined")
        {
            receivedActions[data.type](data);
        }
    }
}

function sendMove(x,y, targetId, entity)
{
    console.log("sending move" + str(x) + str(y) + "target ID: " + str(targetId))
    let DEFAULTRADIUS = 40;
    let target = null;
    if(targetId != -1)
    {
        target = findEntityByID(targetId); // get target ent based on id
    }
    console.log(target)
    if(entity.type !== "cave" && entity.type !== "house")//if ent can move
    {
        let data = null;
        if(entity.type === "worker" && target != null && target.type === "cave") //if a worker targets a cave, start harvesting
        {
            data = {
                type: "doAction",
                actionType: "harvest",
                id: entity.id,
                targetId: targetId
            };
        }
        else if(target != null && target.type !== "cave") //in any other case if an ent is targeted start attacking
        {
            data = {
                type: "doAction",
                actionType: "attack",
                id: entity.id,
                targetId: targetId
            };
        }
        else //if no ent is targeted, move
        {
            data = {
                type: "doAction",
                actionType: "move",
                id: entity.id,
                x: x,
                y: y
            };
        }
        if(data != null) //send data to server
        {
            ws.send(JSON.stringify(data));
        }    
    }
}

//send the server a message to create a new entity
function createEntity(x, y, entType)
{
    console.log("creating " + str(entType) + " at " + str(x) + ", " + str(y));
    ws.send(JSON.stringify({
        type: "createUnit",
        entityType: entType,
        x: x,
        y: y
    }))
}

var receivedActions = {
    //if the client recieves the map they will save it and do some updates
    sendMap: function(data)
    {
        worldMap = data.worldMap;
        if(typeof worldMap === "undefined" || typeof worldMap.length !== "number" || worldMap.length == 0)
        {
            gameWidth = 0;
            gameHeight = 0;
        }
        else
        {
            gameWidth = worldMap.length * tileSideLength;
            gameHeight = worldMap[0].length * tileSideLength;
        }
        
    },
    //if the client recieves an entity creation, they will add it to the list of entities they know about
    createEntity: function(data)
    {
        console.log("ent created")
        changeEntNums(data, 1)
        let ent = new Entity(data.unitType, data.id, data.isFriendly, data.x, data.y, data.z);
        entityList.push(ent);
        if(ent.isFriendly)
        {
            friendlyEntityList.push(ent);
        }
    },
    //if the client recieves an update to an entity they will update that entity
    updateEntity: function(data)
    {
        id = data.id;
        let ent = findEntityByID(id);
        if(ent != null)
        {
            ent.x = data.x;
            ent.y = data.y;
            ent.z = data.z;
        }
    },
    //if the client recieves info saying an entity is destroyed they will get rid of it from the list of entities they know about
    destroyEntity: function(data)
    {
        let id = data.id;
        changeEntNums(data, -1);
        for(let i = 0; i < entityList.length; i++)
        {
            let ent = entityList[i];
            if(ent.id == id)
            {
                entityList.splice(i, 1);
                if(ent.isFriendly)
                {
                    for(j = 0; j < friendlyEntityList.length; j++)
                    {
                        if(friendlyEntityList[j] == ent)
                        {
                            friendlyEntityList.splice(j, 1);
                            break;
                        }
                    }
                }
                break;
            }
        }
    },
    //if the client is told how many resources they have, they will keep track of that
    updateResources: function(data)
    {
        resources = data.amount;
    }
}

function findCave(){
    var cavesFound = 0;
    for(var i = 0; i < entityList.length; i++){
        if(entityList[i].type == "cave"){
            cavesFound ++;
            if(fWorkers < 5){
                console.log("found cave")
                return entityList[i].id;
            }
            if(fWorkers < 15 && cavesFound > 1){
                return entityList[i].id;
            }
            if(fWorkers < 25 && cavesFound > 2){
                return entityList[i].id;
            }
        }
    }
    return -1;
}

function findHouse(friendly){
    var cavesFound = 0;
    for(var i = 0; i < entityList.length; i++){
        if(entityList[i].type == "house" && entityList[i].isFriendly == friendly){
            return entityList[i].id;
        }
    }
    return -1;
}

function makeMoves(){
    console.log(fWorkers);
    if(houseCoords == []){
        var friendlyHouseID = findHouse(true);
        houseCoords = [findEntityByID(friendlyHouseID).x, findEntityByID(friendlyHouseID).y];
    }
    if(fWorkers < 5 && resources >= 10){
        console.log("creating initial worker");
        createEntity(0, 0, "worker");
        fWorkers++;
    }
    if(fWorkers > 5 && fWorkers % 5 == 1 && resources >= 15){
        createEntity(0, 0, "fighter");
        fFighters++;
        fWorkers++;
    }
    if((fWorkers % 5 != 1 && resources >= 10) || (fWorkers == 0 && resources >= 10 && resources <= 15)){
        console.log("creating another worker");
        createEntity(0, 0, "worker");
        fWorkers++;
    }
    for(var i = 0; i < entityList.length; i++){
        ent = entityList[i];
        if(ent.isFriendly){
            if(ent.type == "worker" && !ent.targeting){
                console.log("sending move 1")
                sendMove(-1, -1, findCave(), ent);
                ent.targeting = true;
            }
            if((ent.type == "fighter" && !ent.targeting) && fFighters >= 5){
                houseId = findHouse(false);
                if(houseId != -1){
                    sendMove(1, 1, houseId, ent);
                    ent.targeting = true;
                }
                else{
                    sendMove(1024 * Math.random(), 1024 * Math.random(), -1, ent);
                }

            }
        }
    }
}

function setup()
{
    connect(startupConnectionAddress);
    setInterval(() => { 
        makeMoves();
        ticks++
    }, 1000 / 60);
}