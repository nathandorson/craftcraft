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

var connected = false;
var ws = new WebSocket("ws://127.0.0.1:5524");
ws.onopen = function() {
    console.log("connected");
    ws.send(JSON.stringify({
        type: "register"
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

}