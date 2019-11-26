import { Module } from "module";
import { EventEmitter } from "events";

var entityList = [];
var players = [];

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
class Player
{
    constructor()
    {
        this.emitter = new EventEmitter();
        this.ownedEntities = [];
    }
    move(id, x, y)
    {
        let entity = findEntityByID(id);
        if(entity != null)
        {
            //
        }
    }
    harvest(id, targetId)
    {
        //
    }
    attack(id, targetId)
    {
        //
    }
    build(id, buildingType, x, y)
    {
        //
    }
}
function requestPlayer()
{
    
}
const EntityStates = {
    IDLE: 0,
    MOVING: 1,
    ATTACKING: 2,
    HARVESTING: 3,
    BUILDING: 4
};
class Entity
{
    constructor(type,x,y,z)
    {
        this.type = type;
        this.x = x;
        this.y = y;
        this.z = z;
        this.state = EntityStates.IDLE;
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
    update()
    {

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
    requestPlayer: requestPlayer
}