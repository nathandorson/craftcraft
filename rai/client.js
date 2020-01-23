//this AI made by Forrest
/**
 * a surface for the terrain background
 */
var worldSurface = null;
/**
 * surface for the lights
 */
var lightSurface = null;
/**
 * surface for the shadows
 */
var shadowSurface = null;
/**
 * map of surfaces for each entity
 */
var entitySurfaces = {};
/**
 * list of entities
 */
var entityList = [];
/**
 * list of friendly entities
 */
var friendlyEntityList = [];
var enemyEntityList = [];
/**
 * list of selected entities
 */
var selectedEntities = [];
/**
 * side length of the map
 */
var mapSideLength = 1024;
/**
 * side length of a single terrain tile
 */
var tileSideLength = 64;
/**
 * terrain height map
 */
var worldMap = [];
/**
 * diameter of a light
 */
var lightDiameter = 200;
/**
 * build radius
 */
var buildRadius = 100;
/**
 * amount of resources
 */
var resources = 0;
/**
 * width the game world
 */
var gameWidth = 640;
/**
 * height of the game world
 */
var gameHeight = 640;
/**
 * whether the control button is pressed
 */
var controlButtonPressed = false;
/**
 * whether the shift button is pressed
 */
var shiftButtonPressed = false;
/**
 * list of drawing information about each entity
 */
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
/**
 * camera for viewing the world
 */
var cam = null;
/**
 * if we are connected to the server
 */
var connected = false;
/**
 * the websocket connection to the server
 */
var ws = null;
/**
 * first mouse select x position
 */
var selectionXi = 0;
/**
 * first mouse select y position
 */
var selectionYi = 0;
/**
 * second mouse select x position
 */
var selectionXf = 0;
/**
 * second mouse select y position
 */
var selectionYf = 0;
/**
 * types of possible actions while selecting
 */
var entitySelectType = {
    DIRECT: 0, //reselect everything in selection area
    ADD: 1, //add selected items to existing selection
    REMOVE: 2 //remove selected items from existing selection
};
/**
 * if we are trying to place an entity
 */
var entityPrimed = false;
/**
 * entity placement x position
 */
var entCreationX = 0;
/**
 * entity placement y position
 */
var entCreationY = 0;
/**
 * entity class; stores info about entities and draws them
 */
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
        //find and set type specific info about entity
        let info = entityInfo[this.type];
        for(let prop in info)
        {
            this[prop] = info[prop];
        }
    }
    /**
     * The method that will draw this entity depending on what type of entity it is
     */
    draw()
    {
        // if there is no surface for this entity, make one
        if(typeof entitySurfaces[this.type] === "undefined")
        {
            updateEntitySurface(this);
        }
        //if there is a surface for this entity, draw it
        if(typeof entitySurfaces[this.type] !== "undefined")
        {
            image(entitySurfaces[this.type], this.x - this.radius, this.y - this.radius);
        }
    }
}
/**
 * A camera, so that the client can look around the game map
 */
class Camera
{
    /**
     * creates a new camera
     */
    constructor()
    {
        /**
         * top left x position of camera
         */
        this.x = 0;
        /**
         * top left y position of camera
         */
        this.y = 0;
        /**
         * x velocity of camera
         */
        this.vx = 0;
        /**
         * y velocity of camera
         */
        this.vy = 0;
        /**
         * zoom level of camera
         */
        this.scaleLevel = 1.5;
        /**
         * speed multiplier of camera
         */
        this.panSpeedMultiplier = 12;
        /**
         * maximum panning speed
         */
        this.maxPanSpeed = 9;
        /**
         * area of zone on sides of the screen to trigger camera movement
         */
        this.panTriggerWidth = 100;
        /**
         * percentage of view size we can go off screen
         */
        this.limitPercentage = 0.1;
        this.updateLimits();
    }
    /**
     * set scale level for drawing
     */
    zoom()
    {
        scale(this.scaleLevel);
    }
    /**
     * update the camera bounds
     */
    updateLimits()
    {
        this.minx = -( width * this.limitPercentage );
        this.miny = -( height * this.limitPercentage );
        this.maxx = gameWidth * this.scaleLevel - (width * (1 - this.limitPercentage));
        this.maxy = gameHeight * this.scaleLevel - (height * (1 - this.limitPercentage));
    }
    /**
     * check for camera panning and pan the camera if necessary
     */
    pan()
    {
        this.vx = 0;
        this.vy = 0;
        if(mouseX > width - this.panTriggerWidth)
        {
            this.vx = this.panSpeedMultiplier * (mouseX + this.panTriggerWidth - width) / this.panTriggerWidth;
        }
        else if(mouseX < this.panTriggerWidth)
        {
            this.vx = this.panSpeedMultiplier * (mouseX - this.panTriggerWidth) / this.panTriggerWidth;
        }
        if(mouseY > height - this.panTriggerWidth)
        {
            this.vy = this.panSpeedMultiplier * (mouseY + this.panTriggerWidth - height) / this.panTriggerWidth;
        }
        else if(mouseY < this.panTriggerWidth)
        {
            this.vy = this.panSpeedMultiplier * (mouseY - this.panTriggerWidth) / this.panTriggerWidth;
        }
        let sgn = Math.sign(this.vx);
        if(this.vx * sgn > this.maxPanSpeed)
        {
            this.vx = this.maxPanSpeed * sgn;
        }
        sgn = Math.sign(this.vy);
        if(this.vy * sgn > this.maxPanSpeed)
        {
            this.vy = this.maxPanSpeed * sgn;
        }
        this.vx /= this.scaleLevel;
        this.vy /= this.scaleLevel;
        this.x += this.vx;
        this.y += this.vy;
        if(this.x < this.minx) this.x = this.minx;
        if(this.y < this.miny) this.y = this.miny;
        if(this.x > this.maxx) this.x = this.maxx;
        if(this.y > this.maxy) this.y = this.maxy;
    }
    /**
     * updates this camera for drawing
     */
    update()
    {
        this.pan();
        this.zoom();
        translate(-this.x, -this.y);
    }
    /**
     * change zoom level
     * @param {number} newScale zoom level to change to
     */
    changeScale(newScale)
    {
        let widthChange = (width / newScale) - (width / this.scaleLevel);
        let heightChange = (height / newScale) - (height / this.scaleLevel);
        this.x -= widthChange * (mouseX / width);
        this.y -= heightChange * (mouseY / height);
        this.scaleLevel = newScale;
        this.updateLimits();
    }
}
//Looks through the list of entities that the client knows about, and returns the entity with
//a specified id
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
//Adds an entity to the entity surface
function updateEntitySurface(ent)
{
    let surf = createGraphics(ent.radius * 2, ent.radius * 2);
    let col = ent.isFriendly ? ent.friendlyColor : ent.opposingColor;
    surf.fill(col[0], col[1], col[2]);
    surf.stroke(ent.outlineColor[0], ent.outlineColor[1], ent.outlineColor[2]);
    surf.strokeWeight(ent.outlineWidth);
    surf.ellipse(ent.radius, ent.radius, ent.radius * 2, ent.radius * 2);
    entitySurfaces[ent.type] = surf;
}
//Updates the world map so it can be drawn properly
function updateWorldSurface()
{
    if(worldSurface == null || worldSurface.width != gameWidth || worldSurface.height != gameHeight)
    {
        worldSurface = createGraphics(gameWidth, gameHeight);
        worldSurface.noStroke();
        for(let r = 0; r < worldMap.length; r++)
        {
            for(let c = 0; c < worldMap[r].length; c++)
            {
                let tile = worldMap[r][c];
                let height = tile.height;
                worldSurface.fill(Math.max(128 - height, 0), height, 0);
                worldSurface.rect(r * tileSideLength, c * tileSideLength, tileSideLength, tileSideLength);
            }
        }
    }
}
//Much of the game world is obscured by shadows so that the client has incomplete information
//This function handles the creation of shadowy areas
function updateShadowSurface()
{
    if(shadowSurface == null || shadowSurface.width != width || shadowSurface.height != height)
    {
        shadowSurface = createGraphics(width, height);
    }
    shadowSurface.blendMode(shadowSurface.BLEND);
    shadowSurface.clear();
    shadowSurface.background(0, 127);
    shadowSurface.blendMode(shadowSurface.REMOVE);
    //update light surface too
    let drawLightDiam = lightDiameter * cam.scaleLevel;
    let drawLightRad = drawLightDiam / 2;
    if(lightSurface == null || lightSurface.width != drawLightDiam || lightSurface.height != drawLightDiam)
    {
        lightSurface = createGraphics(drawLightDiam, drawLightDiam);
        lightSurface.clear();
        lightSurface.ellipse(drawLightRad, drawLightRad, drawLightDiam, drawLightDiam);
    }
    for(let i = 0; i < friendlyEntityList.length; i++)
    {
        let ent = friendlyEntityList[i];
        let uipos = gameToUICoord(ent.x, ent.y);
        if(uipos[0] > 0 && uipos[1] > 0 && uipos[0] < width && uipos[1] < height)
        {
            shadowSurface.fill(255, 255);
            shadowSurface.noStroke();
            let entCoord = gameToUICoord(ent.x, ent.y);
            shadowSurface.image(lightSurface, entCoord[0] - drawLightRad, entCoord[1] - drawLightRad);
        }
    }
}
//Draws the game world
function drawWorld()
{
    updateWorldSurface();
    updateShadowSurface();
    image(worldSurface, 0, 0);
    for(let i = 0; i < entityList.length; i++)
    {
        let ent = entityList[i];
        ent.draw();
    }
    for(let i = 0; i < selectedEntities.length; i++)
    {
        let ent = selectedEntities[i];
        stroke(0, 0, 255);
        strokeWeight(3);
        noFill();
        ellipse(ent.x, ent.y, ent.radius * 2, ent.radius * 2);
        strokeWeight(1);
    }
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
        cam.updateLimits();
    },
    //if the client recieves an entity creation, they will add it to the list of entities they know about
    createEntity: function(data)
    {
        let ent = new Entity(data.unitType, data.id, data.isFriendly, data.x, data.y, data.z);
        entityList.push(ent);
        if(ent.isFriendly)
        {
            friendlyEntityList.push(ent);
        }
        else
        {
            if(ent.type !== "cave")
            {
                enemyEntityList.push(ent);
            }
        }
        switch(ent.type)
        {
            case "cave":
                caveList.push(ent);
                break;
            case "worker":
                workerList.push(ent);
                break;
            case "fighter":
                fighterList.push(ent);
                break;
            case "house":
                houseList.push(ent);
                break;
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
        //console.log(id);
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
                else
                {
                    enemyEntityList.splice(enemyEntityList.indexOf(ent), 1);
                }
                switch(ent.type)
                {
                    case "cave":
                        caveList.splice(caveList.indexOf(ent), 1);
                        break;
                    case "worker":
                        workerList.splice(workerList.indexOf(ent), 1);
                        break;
                    case "fighter":
                        fighterList.splice(fighterList.indexOf(ent), 1);
                        break;
                    case "house":
                        houseList.splice(houseList.indexOf(ent), 1);
                        break;
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
//attempts to connect to a specified ip address
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
            name: "s's ai"
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
//sets up the screen and the connection
function setup()
{
    createCanvas(windowWidth, windowHeight);
    //background(255);
    cam = new Camera();
    connect("ws://127.0.0.1:5524");
    noLoop();
    setInterval(() => { draw(); }, 1000 / 60);
}
//resizes the window on the monitor
function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
    cam.updateLimits();
}

var theight = null;

//draw text with black background, used to show resources and prompt unit creation
function drawContrastedText(textStr, x, y, padding)
{
    if(theight == null) theight = textAscent() + textDescent();
    if(typeof padding === "undefined") padding = 4;
    let twidth = textWidth(textStr);
    fill(0);
    rect(x - padding, y - padding, twidth + padding * 2, theight + padding * 2);
    fill(255);
    textAlign(LEFT, TOP);
    text(textStr, x, y);
}
//converts game location to screen location
function gameToUICoord(x, y)
{
    return [
        (x - cam.x) * cam.scaleLevel,
        (y - cam.y) * cam.scaleLevel
    ];
}
//converts screen location to game location
function UIToGameCoord(x, y)
{
    return [
        (x / cam.scaleLevel) + cam.x,
        (y / cam.scaleLevel) + cam.y
    ];
}
var entityNumbersRate = 8;
var currentEntityNumberRateAmount = 0;
var caveList = [], workerList = [], fighterList = [], houseList = [];
var hasCreatedWorkers = false;
var maxCaveDist = 384;
//draws the game and the user interface
function draw()
{
    background(255); //baclground color
    push();
    cam.update();
    drawWorld();
    pop();
    image(shadowSurface, 0, 0);
    fill(0,0,255,100);
    if(currentEntityNumberRateAmount >= 0)
    {
        currentEntityNumberRateAmount--;
    }
    else
    {
        if(houseList != null && houseList.length > 0)
        {
            let house = houseList[0];
            let angle = Math.random() * 2 * Math.PI;
            let xoff = Math.cos(angle) * 64;
            let yoff = Math.sin(angle) * 64;
            if(workerList.length < 6 || workerList.length <= fighterList.length) // 1:1
            {
                if(resources >= 10 || !hasCreatedWorkers)
                {
                    createEntity(house.x + xoff, house.y + yoff, "worker");
                    hasCreatedWorkers = true;
                }
            }
            else
            {
                if(resources >= 15)
                {
                    createEntity(house.x + xoff, house.y + yoff, "fighter");
                }
            }
        }
        if(caveList.length > 0 && houseList.length > 0)
        {
            let potentialCaves = [];
            let hx = houseList[0].x;
            let hy = houseList[0].y;
            for(let i = 0; i < caveList.length; i++)
            {
                let cave = caveList[i];
                if((cave.x - hx) ** 2 + (cave.y - hy) ** 2 < maxCaveDist ** 2)
                {
                    potentialCaves.push(cave);
                }
            }
            let caveInd = 0;
            for(let i = 0; i < workerList.length; i++)
            {
                let worker = workerList[i];
                let cave = potentialCaves[caveInd];
                ws.send(JSON.stringify({
                    type: "doAction",
                    actionType: "harvest",
                    id: worker.id,
                    targetId: cave.id
                }));
                caveInd++;
                if(caveInd >= potentialCaves.length) caveInd = 0;
            }
        }
        if(fighterList.length >= 12)
        {
            for(let i = 0; i < fighterList.length; i++)
            {
                let fighter = fighterList[i];
                if(houseList.length > 0)
                {
                    ws.send(JSON.stringify({
                        type: "doAction",
                        actionType: "move",
                        id: fighter.id,
                        x: gameWidth - houseList[0].x,
                        y: gameHeight - houseList[0].y
                    }));
                }
            }
        }
        if(enemyEntityList.length > 0)
        {
            let enemyInd = 0;
            for(let i = 0; i < fighterList.length; i++)
            {
                let fighter = fighterList[i];
                let enemy = enemyEntityList[Math.floor(enemyInd)];
                ws.send(JSON.stringify({
                    type: "doAction",
                    actionType: "attack",
                    id: fighter.id,
                    targetId: enemy.id
                }));
                enemyInd += 0.5;
                if(enemyInd >= enemyEntityList.length) enemyInd = 0;
            }
        }

        currentEntityNumberRateAmount = entityNumbersRate;
    }
    var messageText = "resources: " + resources + " zoom: " + cam.scaleLevel;
    drawContrastedText(messageText, 20, 20);
}

//find all friendly ents within a selection rectangle and add them to a list
function selectEntities(xi, yi, xf, yf, selectType)
{
    if(typeof selectType === "undefined")
    {
        selectType = entitySelectType.DIRECT;
    }
    let foundEntities = [];
    let lowX = Math.min(xi,xf);
    let highX = Math.max(xi,xf);
    let lowY = Math.min(yi,yf);
    let highY = Math.max(yi,yf);
    for(let i = 0; i < entityList.length; i++) //add all friendly ents within rect to a list
    {
        let ent = entityList[i];
        if(ent.x > lowX && ent.x < highX && ent.y > lowY && ent.y < highY && ent.isFriendly)
        {
            foundEntities.push(entityList[i]);
        }
    }
    if(selectType === entitySelectType.DIRECT) //replace old list of selected ents with new list
    {
        selectedEntities = foundEntities;
    }
    else if(selectType === entitySelectType.ADD) //add new list to old list
    {
        for(let i = 0; i < foundEntities.length; i++)
        {
            let ent = foundEntities[i];
            if(selectedEntities.indexOf(ent) < 0)
            {
                selectedEntities.push(ent);
            }
        }
    }
    else
    {
        for(let i = 0; i < foundEntities.length; i++)
        {
            let ent = foundEntities[i];
            let ind = selectedEntities.indexOf(ent);
            if(ind >= 0)
            {
                selectedEntities.splice(ind, 1);
            }
        }
    }
}

//based on target coordinates, for each selected entity, find what kind of action they will take and tell the server
function sendMove(x,y)
{
    let DEFAULTRADIUS = 40;
    let targetId = -1;
    for(let i = 0; i < entityList.length; i++) //if the player has targeted an ent, find that ent ant set targetId accordingly
    {
        let ent = entityList[i];
        if(!ent.isFriendly)
        {
            let dist = Math.sqrt((x-ent.x)**2 + (y-ent.y)**2);
            if(dist < DEFAULTRADIUS)
            {
                targetId = ent.id;
            }
        }
    }
    let target = null;
    if(targetId != -1)
    {
        target = findEntityByID(targetId); // get target ent based on id
    }
    for(let i = 0; i < selectedEntities.length; i++)
    {
        let entity = selectedEntities[i];
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
    // if(targetId != -1)
    // {
    //     let target = findEntityByID(targetId)
    //     if(target.type != "cave"){
    //         for(let i = 0; i < selectedEntities.length; i++)
    //         {
    //             let ent = selectedEntities[i];
    //             ws.send(JSON.stringify({
    //                 type: "doAction",
    //                 actionType: "attack",
    //                 id: ent.id,
    //                 targetId: targetId
    //             }));
    //         }
    //     }
    //     else
    //     {
    //         for(let i = 0; i < selectedEntities.length; i++)
    //         {
    //             let ent = selectedEntities[i];
    //             if(ent === "worker")
    //             {
    //                 ws.send(JSON.stringify({
    //                     type: "doAction",
    //                     actionType: "harvest",
    //                     id: ent.id,
    //                     targetId: targetId
    //                 }));
    //             }
    //         }
    //     }
    // }
    // else
    // {
    //     for(let i = 0; i < selectedEntities.length; i++)
    //     {
    //         let ent = selectedEntities[i];
    //         if(ent.type != "house" && ent.type != "cave")
    //         {
    //             ws.send(JSON.stringify({
    //                 type: "doAction",
    //                 actionType: "move",
    //                 id: ent.id,
    //                 x: x,
    //                 y: y
    //             }));
    //         }
    //     }
    // }
}

//prime an entity
function prepareEntity()
{
    entityPrimed = true;
}

//send the server a message to create a new entity
function createEntity(x,y,entType)
{
    ws.send(JSON.stringify({
        type: "createUnit",
        entityType: entType,
        x: x,
        y: y
    }))
    entityPrimed = false;
}

//start selecting ents by dragging a rectangle over them
function mousePressed()
{'s'
    if(mouseButton == LEFT)
    {
        let selCoord = UIToGameCoord(mouseX, mouseY);
        selectionXi = selCoord[0];
        selectionYi = selCoord[1];
    }
}

//finish selecting ents by dragging a rectangle over them
function mouseReleased()
{
    /*if(mouseButton == LEFT)
    {
        let selCoord = UIToGameCoord(mouseX, mouseY);
        selectionXf = selCoord[0];
        selectionYf = selCoord[1];
        let mode = entitySelectType.DIRECT;
        if(controlButtonPressed)
        {
            mode = entitySelectType.ADD;
        }
        else if(shiftButtonPressed)
        {
            mode = entitySelectType.REMOVE;
        }
        selectEntities(selectionXi, selectionYi, selectionXf, selectionYf, mode);
    }*/
}
function mouseClicked() //right click to do action
{
    /*if(mouseButton == RIGHT)
    {
        sendMove(mouseX,mouseY);
    */}
}
function keyPressed()
{
    /*if(entityPrimed) //player has pressed a button to create an ent
    {
        if(key=='1')
        {
            entCreationX = UIToGameCoord(mouseX);
            entCreationY = UIToGameCoord(mouseY);
            createEntity(entCreationX,entCreationY,"house");
        }
        if(key=='2')
        {
            createEntity(entCreationX,entCreationY,"fighter");
        }
        if(key=='3')
        {
            createEntity(entCreationX,entCreationY,"worker");
        }
    }*/
    if(keyCode===UP_ARROW) //zoom out
    {
        cam.changeScale(cam.scaleLevel * 1.1);
    }
    else if(keyCode===DOWN_ARROW) //zoom in
    {
        cam.changeScale(cam.scaleLevel / 1.1);
    }
    /*else if(keyCode === CONTROL)
    {
        controlButtonPressed = true;
    }
    else if(keyCode === SHIFT)
    {
        shiftButtonPressed = true;
    }
    if(key=='a'||key=='A')
    {
        //something something attack with all selected units that are valid to do so
    }
    else if(key=='c') //begin to create an entity, a prompt will appear asking which kind
    {
        if(!entityPrimed)
        {
            prepareEntity();
        }
        else
        {
            entityPrimed = false;
        }
    }
    else if(key=='s') //action
    {
        sendMove(mouseX/cam.scaleLevel+cam.x,mouseY/cam.scaleLevel+cam.y);
    }*/
    
}
function keyReleased()
{
    if(keyCode === CONTROL)
    {
        controlButtonPressed = false;
    }
    else if(keyCode === SHIFT)
    {
        shiftButtonPressed = false;
    }
}