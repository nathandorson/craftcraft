var worldSurface = null, lightSurface = null, shadowSurface = null;
var entitySurfaces = {};
var entityList = []; //the list of all entities that this client knows about
var friendlyEntityList = []; //the list of entities that this client controls
var selectedEntities = []; //the list of entities that the client currently has selected in order to move them or give them a command
var mapSideLength = 1024, tileSideLength = 64; //the size of the game world, and the size of each differently colored tile in the world
var worldMap = []; //a two dimensional array of tiles that is used to represent the world
var lightDiameter = 200; //how far entities push back the shadows, allowing sight for the client
var buildRadius = 100; //how far away from houses the client can build
var resources = 0; // the number of resources this client owns
var gameWidth = 640, gameHeight = 640; //the size of the screen
var numWorkers = 0;
var numFighters = 0;
var baseX = 0;
var baseY = 0;
var settling = false;
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
var cam; //the camera that is used to look around the game world
var connected = false, ws = null; //if the client is connected, and what websocket they are connected to
var selectionXi = 0, electionXf = 0, selectionYi = 0, selectionYf = 0;
var entitySelectType = { DIRECT: 0, ADD: 1, REMOVE: 2 };
var entityPrimed = false;
var entCreationX = 0, entCreationY = 0;
/**
 * Class used to keep track of entities that the client knows about
 */
class Entity
{
    constructor(type,id,isFriendly,x,y,z)
    {
        this.type = type; //entity type
        this.id = id; //entity id
        this.isFriendly = isFriendly; //if the client owns the entity
        this.x = x; //entity x location
        this.y = y; //entity y location
        this.z = z; //entity z location (not used at present)
        this.harvesting = false;
        this.targetId = -1;
        this.mainColor = [255, 255, 255]; //entity's color
        this.outlineColor = [0, 0, 0]; //entity's outline color
        this.outlineWidth = 1; //the width of the outline of the entity
        this.radius = 10; //the radius of this entity (they are just circles)
        let info = entityInfo[this.type];
        for(let prop in info)
        {
            this[prop] = info[prop];
        }
        if(this.type=="cave")
        {
            this.numWorkers = 0;
        }
    }
    /**
     * The method that will draw this entity depending on what type of entity it is
     */
    draw()
    {
        if(typeof entitySurfaces[this.type] === "undefined")
        {
            updateEntitySurface(this);
        }
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
    constructor()
    {
        this.x = 0; //camera x location (top left)
        this.y = 0; //camera y location (top left)
        this.vx = 0; //camera movevent speed in the x direction
        this.vy = 0; //camera movement speed in the y direction
        this.scaleLevel = 1.5; //the zoom level of the camera
        this.panSpeedMultiplier = 12; //how fast the camera ramps up speed
        this.maxPanSpeed = 9; //the max camera movement speed
        this.panTriggerWidth = 100; //how close to the edge the mouse must be to trigger camera movement
        this.limitPercentage = 0.1; //the limit on where the camera moves relative to the map (so you cannot go too far off the side of the map)
        this.updateLimits();
    }
    //Zooms the camera to the current zoom level
    zoom()
    {
        scale(this.scaleLevel);
    }
    //Changes the boundaries on camera for when the camera zooms
    updateLimits()
    {
        this.minx = -( width * this.limitPercentage );
        this.miny = -( height * this.limitPercentage );
        this.maxx = gameWidth * this.scaleLevel - (width * (1 - this.limitPercentage));
        this.maxy = gameHeight * this.scaleLevel - (height * (1 - this.limitPercentage));
    }
    //Moves the camera to its correct position. Called every draw() step so the camera is always in the correct spot
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
    //Does all relevant movements for the camera. Done every draw() step
    update()
    {
        this.pan();
        this.zoom();
        translate(-this.x, -this.y);
    }
    //Rescales the camera
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
    shadowSurface.background(0,127);
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
            if(ent.type=="worker")
            {
                numWorkers++;
                let caves = [];
                for(let i = 0; i < entityList.length; i++)
                {
                    let c = entityList[i];
                    if(c.type=="cave" && c.numWorkers < 4)
                    {
                        caves.push(c);
                    }
                }
                console.log("worker made")
                if(caves.length > 0)
                {
                    console.log("caves found")
                    let cave = caves[Math.floor(caves.length*Math.random())]; //todo CAVES DONT EXIST YET
                    let data = {
                        type: "doAction",
                        actionType: "harvest",
                        id: ent.id,
                        targetId: cave.id
                    };
                    cave.numWorkers++;
                    findEntityByID(ent.id).harvesting = true;
                    ws.send(JSON.stringify(data));
                }
            }
            if(ent.type=="fighter")
            {
                numFighters++;
                data = {
                    type: "doAction",
                    actionType: "move",
                    id: ent.id,
                    x: baseY,
                    y: baseX
                };
                ws.send(JSON.stringify(data));
            }
            if(ent.type=="house")
            {
                baseX = ent.x;
                baseY = ent.y;
                ws.send(JSON.stringify({
                    type: "createUnit",
                    entityType: "worker",
                    x: ent.x+buildRadius/2,
                    y: ent.y+buildRadius/2
                }))
                ws.send(JSON.stringify({
                    type: "createUnit",
                    entityType: "worker",
                    x: ent.x-buildRadius/2,
                    y: ent.y+buildRadius/2
                }))
                ws.send(JSON.stringify({
                    type: "createUnit",
                    entityType: "worker",
                    x: ent.x+buildRadius/2,
                    y: ent.y-buildRadius/2
                }))
            }
        }
        if(ent.type == "cave")
        {
            let caves = [];
            for(let i = 0; i < entityList.length; i++)
            {
                let c = entityList[i];
                if(c.type=="cave" && c.numWorkers < 4)
                {
                    caves.push(c);
                }
            }
            for(let i = 0; i < friendlyEntityList.length; i++)
            {
                let w = friendlyEntityList[i];
                if(w.type=="worker" && !w.harvesting)
                {
                    if(caves.length > 0)
                    {
                        let cave = caves[Math.floor(caves.length*Math.random())];
                        let data = {
                            type: "doAction",
                            actionType: "harvest",
                            id: w.id,
                            targetId: cave.id
                        };
                        cave.numWorkers++;
                        w.harvesting=true;
                        ws.send(JSON.stringify(data));
                    }
                }
            }
        }
        if((ent.type=="house" || ent.type=="fighter" || ent.type=="worker") && !ent.isFriendly)
        {
            for(let i = 0; i < friendlyEntityList.length; i++)
            {
                let f = friendlyEntityList[i];
                if(f.type=="fighter" && f.targetId == -1)
                {
                    let data = {
                        type: "doAction",
                        actionType: "attack",
                        id: f.id,
                        targetId: ent.id
                    };
                    f.targetId = ent.id;
                    ws.send(JSON.stringify(data));
                }
            }
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
        if(ent != null && (ent.type=="house" || ent.type=="fighter" || ent.type=="worker") && !ent.isFriendly)
        {
            for(let i = 0; i < friendlyEntityList.length; i++)
            {
                let f = friendlyEntityList[i];
                if(f.type=="fighter" && f.targetId == -1)
                {
                    let data = {
                        type: "doAction",
                        actionType: "attack",
                        id: f.id,
                        targetId: ent.id
                    };
                    f.targetId = ent.id;
                    ws.send(JSON.stringify(data));
                }
            }
        }
        if(ent.type=="fighter" && ent.isFriendly)
        {
            for(let i = 0; i < entityList.length; i++)
            {
                let h = entityList[i];
                if(h.type=="house" && !h.isFriendly)
                {
                    let data = {
                        type: "doAction",
                        actionType: "attack",
                        id: ent.id,
                        targetId: h.id
                    };
                    ent.targetId = h.id;
                    ws.send(JSON.stringify(data));
                }
            }
        }
        
        
    },
    //if the client recieves info saying an entity is destroyed they will get rid of it from the list of entities they know about
    destroyEntity: function(data)
    {
        let id = data.id;
        for(let i = 0; i < friendlyEntityList.length; i++)
        {
            let ent = friendlyEntityList[i];
            if(ent.targetId == id)
            {
                ent.targetId = -1;
                let action = {
                    type: "doAction",
                    actionType: "move",
                    id: ent.id,
                    x: baseY,
                    y: baseX
                };
                for(let j = 0; j < entityList.length; j++)
                {
                    let h = entityList[j];
                    if(h.type=="house"&&!h.isFriendly)
                    {
                        action = {
                            type: "doAction",
                            actionType: "attack",
                            id: ent.id,
                            targetId: h.id
                        };
                        ent.targetId = h.id;
                    }
                }
                ws.send(JSON.stringify(action));
            }
        }
        for(let i = 0; i < entityList.length; i++)
        {
            let ent = entityList[i];
            if(ent.id == id)
            {
                entityList.splice(i, 1);
                if(ent.isFriendly)
                {
                    if(ent.type=="worker")
                    {
                        numWorkers--;
                    }
                    if(ent.type=="fighter")
                    {
                        numFighters--;
                    }
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
        if(resources>=15)
        {
            if(numWorkers<10)
            {
                ws.send(JSON.stringify({
                    type: "createUnit",
                    entityType: "worker",
                    x: baseX + buildRadius/2,
                    y: baseY + buildRadius/2
                }))
            }
            else if(numWorkers < 30)
            {
                if(numFighters<5)
                {
                    ws.send(JSON.stringify({
                        type: "createUnit",
                        entityType: "fighter",
                        x: baseX + buildRadius/2 + Math.random(),
                        y: baseY - buildRadius/2 + Math.random()
                    }))
                }
                else
                {
                    ws.send(JSON.stringify({
                        type: "createUnit",
                        entityType: "worker",
                        x: baseX + buildRadius/2,
                        y: baseY + buildRadius/2
                    }))
                }
            }
            else if(numFighters < 16)
            {
                ws.send(JSON.stringify({
                    type: "createUnit",
                    entityType: "fighter",
                    x: baseX + buildRadius/2 + Math.random(),
                    y: baseY - buildRadius/2 + Math.random()
                }))
            }
            else if(resources > 100)
            {
                if(settling==true)
                {
                    ws.send(JSON.stringify({
                        type: "createUnit",
                        entityType: "house",
                        x: baseX,
                        y: baseY
                    }))
                }
            }
            else if(settling == false)
            {
                for(let i = 0; i < friendlyEntityList.length; i++)
                {
                    let w = friendlyEntityList[i];
                    if(w.type=="worker")
                    {
                        data = {
                            type: "doAction",
                            actionType: "move",
                            id: w.id,
                            x: baseX-10,
                            y: baseX-10
                        };
                        settling = true;
                        ws.send(JSON.stringify(data));
                        break;
                    }
                }
            }
        }
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
            name: "n's ai"
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
    background(255);
    cam = new Camera();
    connect(startupConnectionAddress);
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
//draws the game and the user interface
function draw()
{
    background(255); //baclground color
    push();
    cam.update();
    drawWorld();
    pop();
    image(shadowSurface, 0, 0);
    fill(0,0,255,100)
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

function keyPressed()
{
    if(keyCode===UP_ARROW) //zoom out
    {
        cam.changeScale(cam.scaleLevel * 1.1);
    }
    else if(keyCode===DOWN_ARROW) //zoom in
    {
        cam.changeScale(cam.scaleLevel / 1.1);
    }
}