//note: surface refers to off-screen graphics buffer
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
 * entity class
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
     * draw this entity
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
 * manages the camera
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
    createEntity: function(data)
    {
        let ent = new Entity(data.unitType, data.id, data.isFriendly, data.x, data.y, data.z);
        entityList.push(ent);
        if(ent.isFriendly)
        {
            friendlyEntityList.push(ent);
        }
    },
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
    destroyEntity: function(data)
    {
        let id = data.id;
        for(let i = 0; i < entityList.length; i++)
        {
            let ent = entityList[i];
            if(ent.id == id)
            {
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
    updateResources: function(data)
    {
        resources = data.amount;
    }
}
function connect(target)
{
    if(ws != null)
    {
        ws.close();
    }
    ws = new WebSocket(target);
    ws.onopen = function() {
        console.log("connected to " + target);
        ws.send(JSON.stringify({
            type: "join"
        }));
        connected = true;
    };
    ws.onclose = function() {
        console.log("disconnected from " + target);
        connected = false;
        entityList = [];
        friendlyEntityList = [];
        selectedEntities = [];
        worldMap = [];
    }
    ws.onmessage = function(ev) {
        let data = JSON.parse(ev.data);
        if(typeof receivedActions[data.type] !== "undefined")
        {
            receivedActions[data.type](data);
        }
    }
}

function setup()
{
    createCanvas(windowWidth, windowHeight);
    background(255);
    cam = new Camera();
    connect(startupConnectionAddress);
}
function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
    cam.updateLimits();
}

var theight = null;
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
function gameToUICoord(x, y)
{
    return [
        (x - cam.x) * cam.scaleLevel,
        (y - cam.y) * cam.scaleLevel
    ];
}
function UIToGameCoord(x, y)
{
    return [
        (x / cam.scaleLevel) + cam.x,
        (y / cam.scaleLevel) + cam.y
    ];
}
function draw()
{
    background(255);
    push();
    cam.update();
    drawWorld();
    pop();
    image(shadowSurface, 0, 0);
    fill(0,0,255,100)
    if(mouseIsPressed)
    {
        let selCoord = gameToUICoord(selectionXi, selectionYi);
        rect(selCoord[0], selCoord[1], mouseX - selCoord[0], mouseY - selCoord[1]);
    }
    if(entityPrimed)
    {
        var messageText = "Press 1 for a house, 2 for a fighter, 3 for a worker.";
        drawContrastedText(messageText, 20, 52);

        let minDist = Infinity;
        let coordinates = UIToGameCoord(mouseX,mouseY);
        let x = coordinates[0];
        let y = coordinates[1];
        for(let i = 0; i < entityList.length; i++)
        {
            let ent = entityList[i];
            if(ent.type == "house" && ent.isFriendly)
            {
                let dist = Math.sqrt((x - ent.x)**2 + (y - ent.y)**2);
                //console.log(dist);
                if(dist < minDist)
                {
                    minDist = dist;
                    if(dist > buildRadius)
                    {
                        entCreationX = ent.x + buildRadius*(x - ent.x)/dist;
                        entCreationY = ent.y + buildRadius*(y - ent.y)/dist;
                    }
                    else
                    {
                        entCreationX = x;
                        entCreationY = y;
                    }
                }
            }
        }
        let UIcoordinates = gameToUICoord(entCreationX,entCreationY);
        fill(0);
        ellipse(UIcoordinates[0],UIcoordinates[1],10,10);
    }
    var messageText = "resources: " + resources + " zoom: " + cam.scaleLevel;
    drawContrastedText(messageText, 20, 20);
}

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
    for(let i = 0; i < entityList.length; i++)
    {
        let ent = entityList[i];
        if(ent.x > lowX && ent.x < highX && ent.y > lowY && ent.y < highY && ent.isFriendly)
        {
            foundEntities.push(entityList[i]);
        }
    }
    if(selectType === entitySelectType.DIRECT)
    {
        selectedEntities = foundEntities;
    }
    else if(selectType === entitySelectType.ADD)
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

function sendMove(x,y)
{
    let DEFAULTRADIUS = 40;
    let targetId = -1;
    for(let i = 0; i < entityList.length; i++)
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
        target = findEntityByID(targetId);
    }
    for(let i = 0; i < selectedEntities.length; i++)
    {
        let entity = selectedEntities[i];
        if(entity.type !== "cave" && entity.type !== "house")
        {
            let data = null;
            if(entity.type === "worker" && target != null && target.type === "cave")
            {
                data = {
                    type: "doAction",
                    actionType: "harvest",
                    id: entity.id,
                    targetId: targetId
                };
            }
            else if(target != null && target.type !== "cave")
            {
                data = {
                    type: "doAction",
                    actionType: "attack",
                    id: entity.id,
                    targetId: targetId
                };
            }
            else
            {
                data = {
                    type: "doAction",
                    actionType: "move",
                    id: entity.id,
                    x: x,
                    y: y
                };
            }
            if(data != null)
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
function prepareEntity()
{
    entityPrimed = true;
}

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

function mousePressed()
{
    if(mouseButton == LEFT)
    {
        let selCoord = UIToGameCoord(mouseX, mouseY);
        selectionXi = selCoord[0];
        selectionYi = selCoord[1];
    }
}
function mouseReleased()
{
    if(mouseButton == LEFT)
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
    }
}
function mouseClicked()
{
    if(mouseButton == RIGHT)
    {
        sendMove(mouseX,mouseY);
    }
}
function keyPressed()
{
    if(entityPrimed)
    {
        if(key=='1')
        {
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
    }
    if(keyCode===UP_ARROW)
    {
        cam.changeScale(cam.scaleLevel * 1.1);
    }
    else if(keyCode===DOWN_ARROW)
    {
        cam.changeScale(cam.scaleLevel / 1.1);
    }
    else if(keyCode === CONTROL)
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
    else if(key=='c')
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
    else if(key=='s')
    {
        sendMove(mouseX/cam.scaleLevel+cam.x,mouseY/cam.scaleLevel+cam.y);
    }
    
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