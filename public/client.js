class Entity
{
    constructor(type,id,x,y,z)
    {
        this.type = type;
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
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
        }
        if(type=="cave")
        {
            this.resourcesLeft = 1000000;
            this.changeResources = function(amt)
            {
                this.resourcesLeft = amt;
            }
        }
    }
}

var entityList = [];
var selectedEntities = [];
var mapSideLength = 512;
var tileSideLength = 64;
var map = [];
function findEntityByID(id,remove=false)
{
    for(let i = 0; i < entityList.length; i++)
    {
        entity = entityList[i];
        if(entity.id==id)
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
    for(let r = 0; r < map.length; r++)
    {
        for(let c = 0; c < map[r].length; c++)
        {
            tile = map[r][c];
            type = tile.type;
            height = tile.height;
            fill(0,255,0);
            rect(r*tileSideLength,y*tileSideLength,tileSideLength,tileSideLength);
        }
    }
    for(let i = 0; i < entityList.length; i++)
    {
        ent = entityList[i];
        fill(255);
        ellipse(ent.x,ent.y,10,10);
    }
}

var connected = false;
var ws = new WebSocket("ws://127.0.0.1:5524");
ws.onopen = function() {
    console.log("connected");
    ws.send(JSON.stringify({
        type: "join"
    }));
    connected = true;
    client.setSocket(ws);
};
ws.onclose = function() {
    console.log("disconnected");
    connected = false;
}
ws.onmessage = function(ev) {
    let data = JSON.parse(ev.data);
    if (data.type == "createEntity")
    {
        entityList.push(new Entity(data.entityType, data.id, data.x, data.y, data.z))
    }
    if(data.type == "updateEntity")
    {
        id = data.id;
    }
    if(data.type == "destroyEntity")
    {
        findEntityByID(data.id,true);
    }
}

function setup()
{
    createCanvas(512,512);
    background(255);
}
function draw()
{
    drawWorld();
}

var selectionXi = 0;
var selectionXf = 0;
var selectionYi = 0;
var selectionYf = 0;
function selectEntities(xi,yi,xf,yf)
{
    selectedEntities = [];
    for(let i = 0; i < entityList.length; i++)
    {
        let ent = entityList[i];
        if(ent.x > xi && ent.x < xf && ent.y > yi && ent.y < yf)
        {
            selectedEntities.push(entityList[i]);
        }
    }
}

function sendMove(x,y)
{
    for(let i = 0; i < selectedEntities.length; i++)
    {
        let ent = selectedEntities[i];
        ws.send(JSON.stringify({
            type: "doAction",
            id: ent.id,
            x: x,
            y: y
        }));
    }
}

function mousePressed()
{
    if(mouseButton == LEFT)
    {
        selectionXi = mouseX;
        selectionYi = mouseY;
    }
}
function mouseReleased()
{
    if(mouseButton == LEFT)
    {
        selectionXf = mouseX;
        selectionYf = mouseY;
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
    if(key=='a'||key=='A')
    {
        //something something attack with all selected units that are valid to do so
    }
}