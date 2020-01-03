class Entity
{
    constructor(type,id,isFriendly,x,y,z)
    {
        this.type = type;
        this.id = id;
        this.isFriendly = isFriendly;
        this.x = x;
        this.y = y;
        this.z = z;
        this.mainColor = [255, 255, 255];
        this.outlineColor = [0, 0, 0];
        this.outlineWidth = 1;
        this.radius = 10;
        if(type=="worker")
        {
            this.move = function(x,y)
            {
                this.x = x;
                this.y = y;
                this.z = z;
            }
            this.harvest = function()
            {
                //
            }
            this.harvesting = false;
            this.harvestTargetID = null;
            this.build = function()
            {
                //
            }
            this.building = false;
            this.buildingTargetLocation = null;
            this.buildingTargetID = null;
            if(isFriendly)
            {
                this.mainColor = [255, 255, 255];
            }
            else
            {
                this.mainColor = [180, 180, 180];
            }
            this.radius = 5;
        }
        if(type=="fighter")
        {
            this.move = function(x,y,z)
            {
                this.x = x;
                this.y = y;
                this.z = z
            }
            this.attack = function()
            {
                //
            }
            this.attacking = false;
            this.attackTargetID = null;
            if(isFriendly)
            {
                this.mainColor = [255, 0, 0];
            }
            else
            {
                this.mainColor = [155, 0, 0];
            }
            this.radius = 7;
        }
        if(type=="house")
        {
            this.isBigHouse = false;
            this.attack = function(type)
            {
                if(type=="fighter")
                {

                }
                else if(type=="worker")
                {

                }
            }
            this.spawnUnit = function()
            {

            }
            if(isFriendly)
            {
                this.mainColor = [150, 150, 150];
            }
            else
            {
                this.mainColor = [75, 75, 75];
            }
            this.radius = 20;
        }
        if(type=="cave")
        {
            this.resourcesLeft = 1000000;
            this.changeResources = function(amt)
            {
                this.resourcesLeft = amt;
            }
            this.radius = 15;
        }
    }
    draw()
    {
        fill(this.mainColor[0], this.mainColor[1], this.mainColor[2]);
        stroke(this.outlineColor[0], this.outlineColor[1], this.outlineColor[2]);
        strokeWeight(this.outlineWidth);
        ellipse(this.x, this.y, this.radius * 2, this.radius * 2);

    }
}
class Camera
{
    constructor()
    {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.scaleLevel = 1;
        this.panSpeedMultiplier = 12;
        this.maxPanSpeed = 9;
        this.panTriggerWidth = 100;
        this.minx = -mapSideLength / 2;
        this.miny = -mapSideLength / 2;
        this.maxx = mapSideLength / 2;
        this.maxy = mapSideLength / 2;
    }
    zoom()
    {
        scale(this.scaleLevel);
    }
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
        this.x += this.vx;
        this.y += this.vy;
        if(this.x < this.minx) this.x = this.minx;
        if(this.y < this.miny) this.y = this.miny;
        if(this.x > this.maxx) this.x = this.maxx;
        if(this.y > this.maxy) this.y = this.maxy;
    }
    update()
    {
        this.pan();
        this.zoom();
        translate(-this.x, -this.y);
    }
}
var entityList = [];
var selectedEntities = [];
var mapSideLength = 1024;
var tileSideLength = 64;
var worldMap = [];
var shadowSurface = null;
var lightDiameter = 200;
var resources = 0;
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

function drawWorld()
{
    if(shadowSurface == null || shadowSurface.width != width || shadowSurface.height != height)
    {
        shadowSurface = createGraphics(width, height);
    }
    stroke(0);
    for(let r = 0; r < worldMap.length; r++)
    {
        for(let c = 0; c < worldMap[r].length; c++)
        {
            let tile = worldMap[r][c];
            let type = tile.type;
            let height = tile.height;
            fill(0,10*height/tileSideLength,0);
            rect(r*tileSideLength,c*tileSideLength,tileSideLength,tileSideLength);
        }
    }
    shadowSurface.blendMode(shadowSurface.BLEND);
    shadowSurface.clear();
    shadowSurface.background(0, 127);
    shadowSurface.blendMode(shadowSurface.REMOVE);
    for(let i = 0; i < entityList.length; i++)
    {
        let ent = entityList[i];
        ent.draw();
        if(ent.isFriendly)
        {
            shadowSurface.fill(255, 255);
            shadowSurface.noStroke();
            shadowSurface.ellipse(ent.x, ent.y, lightDiameter, lightDiameter);
        }
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
    image(shadowSurface, 0, 0);
}
var connected = false, ws = null;
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
        selectedEntities = [];
        worldMap = [];
    }
    ws.onmessage = function(ev) {
        let data = JSON.parse(ev.data);
        //console.log(data);
        if (data.type == "sendMap")
        {
            worldMap = data.worldMap;
        }
        if (data.type == "createEntity")
        {
            entityList.push(new Entity(data.unitType, data.id, data.isFriendly, data.x, data.y, data.z))
        }
        if(data.type == "updateEntity")
        {
            id = data.id;
            let ent = findEntityByID(id);
            ent.x = data.x;
            ent.y = data.y;
            ent.z = data.z;
        }
        if(data.type == "destroyEntity")
        {
            console.log("destroying " + data.id);
            findEntityByID(data.id, true);
        }
        if(data.type = "updateResources")
        {
            resources += data.ammount;
        }
    }
}

function setup()
{
    createCanvas(640,640);
    background(255);
    cam = new Camera();
    connect(startupConnectionAddress);
}

var cam;

function draw()
{
    background(255);
    push();
    cam.update();
    drawWorld();
    fill(0,0,255,100)
    if(mouseIsPressed)
    {
        rect(selectionXi,selectionYi,mouseX/cam.scaleLevel+cam.x-selectionXi,mouseY/cam.scaleLevel+cam.y-selectionYi);
    }
    pop();
    if(entityPrimed)
    {
        var messageText = "Press 1 for a house, 2 for a fighter, 3 for a worker.";
        let borderPadding = 4;
        let twidth = textWidth(messageText);
        let theight = textAscent() + textDescent();
        fill(0);
        rect(20 - borderPadding, 20 - borderPadding, twidth + borderPadding, theight + borderPadding);
        fill(255);
        textAlign(LEFT, TOP);
        text(messageText, 20, 20);
    }
    var messageText = "resources: " + str(resources);
        let borderPadding = 4;
        let twidth = textWidth(messageText);
        let theight = textAscent() + textDescent();
        fill(0);
        rect(20 - borderPadding, 20 - borderPadding, twidth + borderPadding, theight + borderPadding);
        fill(255);
        textAlign(LEFT, BOTTOM);
        text(messageText, 20, 20);
}

var selectionXi = 0;
var selectionXf = 0;
var selectionYi = 0;
var selectionYf = 0;

function selectEntities(xi,yi,xf,yf)
{
    selectedEntities = [];
    let lowX = Math.min(xi,xf);
    let highX = Math.max(xi,xf);
    let lowY = Math.min(yi,yf);
    let highY = Math.max(yi,yf);
    for(let i = 0; i < entityList.length; i++)
    {
        let ent = entityList[i];
        if(ent.x > lowX && ent.x < highX && ent.y > lowY && ent.y < highY && ent.isFriendly)
        {
            selectedEntities.push(entityList[i]);
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
    if(targetId != -1)
    {
        for(let i = 0; i < selectedEntities.length; i++)
        {
            let ent = selectedEntities[i];
            ws.send(JSON.stringify({
                type: "doAction",
                actionType: "attack",
                id: ent.id,
                targetId: targetId
            }));
        }
    }
    else{
        for(let i = 0; i < selectedEntities.length; i++)
        {
            let ent = selectedEntities[i];
            ws.send(JSON.stringify({
                type: "doAction",
                actionType: "move",
                id: ent.id,
                x: x,
                y: y
            }));
        }
    }
    
}

var entityPrimed = false;
var entCreationX = 0;
var entCreationY = 0;

function prepareEntity(x,y)
{
    entCreationX = x;
    entCreationY = y;
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
        selectionXi = mouseX/cam.scaleLevel+cam.x;
        selectionYi = mouseY/cam.scaleLevel+cam.y;
    }
}
function mouseReleased()
{
    if(mouseButton == LEFT)
    {
        selectionXf = mouseX/cam.scaleLevel+cam.x;
        selectionYf = mouseY/cam.scaleLevel+cam.y;
        selectEntities(selectionXi,selectionYi,selectionXf,selectionYf);
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
        cam.scaleLevel = cam.scaleLevel + 0.1;
    }
    if(keyCode===DOWN_ARROW)
    {
        cam.scaleLevel = cam.scaleLevel - 0.1;
    }
    if(key=='a'||key=='A')
    {
        //something something attack with all selected units that are valid to do so
    }
    if(key=='c')
    {
        prepareEntity(mouseX/cam.scaleLevel+cam.x, mouseY/cam.scaleLevel+cam.y);
    }
    if(key=='s')
    {
        sendMove(mouseX/cam.scaleLevel+cam.x,mouseY/cam.scaleLevel+cam.y);
    }
}