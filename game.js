import { Module } from "module";

var entityList = [];

var mapSideLength = 512;
var tileSideLength = 64;
var map = [];
for(let r = 0; r < mapSideLength; r+=tileSideLength)
{
    row = [];
    for(let c = 0; c < mapSideLength; c+=tileSideLength)
    {
        row.push({"type":"ground","height":r+c})
    }
    map.push(row);
}

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
                this.z = z;
            }
            this.attack = function(targetID)
            {
                this.attackTargetID == targetID;
                let attackTarget = getEntityById(attackTargetID);
                let deltaX = this.x - attackTarget.x;
                let deltaY = this.y - attackTarget.y;
                this.movementAngle = math.atan(deltaY/deltaX);
                this.attacking == true;
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

class GameBoard
{

    constructor(){
        //input int id, str type, arr action
        //call appropriate update function based on type
        this.updateEnt = function(id, type, action){
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
        this.updateUnit = function(id, action){

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
        this.updateHouse = function(id, action){

            let ent = getEntityById(id);

            if(action[0] == "makeWorker"){
                ent.makeWorker(action[1])
            }
        }

        //input int id, arr action
        //update ent list based on action
        this.updateCave = function(id, action){

            ent = getEntityById(id) 

            if(action[0] == "changeResources"){
                ent.changeResources(action[1])
            }
        }
    }


}
module.exports = {
    GameBoard: GameBoard,
}