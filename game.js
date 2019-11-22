var entityList = [];

var mapSideLength = 512;
var tileSideLength = 64;
var map = [];
for(let r = 0; r < 4; r++)
{
    row = [];
    for(let c = 0; c < 4; c++)
    {
        row.push({"type":"ground","height":r+c})
    }
    map.push(row);
}

class Entity
{
    constructor(type,x,y,z)
    {
        this.type = type;
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
            this.attack = function()
            {
                //attack nearby enemy units
            }
            this.spawnUnit = function()
            {

            }
        }
        if(type=="cave")
        {
            this.resourcesLeft = 1000000;
        }
    }
}

function findEntityByID(id)
{
    for(let i = 0; i < entityList.length; i++)
    {
        entity = entityList[i];
        if(entity.id==id)
        {
            return entity;
        }
    }
    return null;
}

//input int id, str type, arr action
//call appropriate update function based on type
function updateEnt(id, type, action){
    if(type == "unit"){
        updateUnit(id, action);
    }
    if(type == "house"){
        updateHouse(id, action);
    }
    if(type == "cave"){
        updateCave(id, action);
    }
}

//input int id, arr action
//update ent list based on action
function updateUnit(id, action){
    
    let ent = getEntityById(id)

    if(action[0] == "build"){
        ent.build(action[1])
    }
    if(action[0] == "attack"){
        ent.attack(action[1])
    }
    if(action[0] == "harvest"){
        ent.harvest(action[1])
    }
    if(action[0] == "move"){
        ent.move(action[1])
    }
}

//input int id, arr action
//update ent list based on action
function updateHouse(id, action){

    let ent = getEntityById(id);

    if(action[0] == "makeWorker"){
        ent.makeWorker([action[1]])
    }
}

//input int id, arr action
//update ent list based on action
function updateCave(id, action){

    ent = getEntityById(id) 

    if(action[0] == "changeResources"){
        ent.changeResources(action[1])
    }
}