//import { Module } from "module";
//import { EventEmitter } from "events";
//import { threadId } from "worker_threads";
var EventEmitter = require("events").EventEmitter;

var entityList = [];
var players = [];
var maxPlayers = 2;
var highestId = 0;
var emitter = new EventEmitter();
function requestId()
{
    return highestId++;
}

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
    constructor(game)
    {
        this.game = game;
        this.emitter = new EventEmitter();
        this.ownedEntities = [];
    }
    findOwnEntityById(id)
    {
        for(let i = 0; i < this.ownedEntities.length; i++)
        {
            let ent = this.ownedEntities[i];
            if(ent.id == id)
            {
                return id;
            }
        }
        return null;
    }
    addEntity(entity)
    {
        //let entity = findEntityByID(id);
        if(entity != null)
        {
            this.ownedEntities.push(entity);
        }
        entityList.push(entity);
        this.emitter.emit("create", entity);
        var _this = this;
        entity.emitter.on("destroy", () => {
            _this.emitter.emit("destroy", entity);
        });
    }
    move(id, x, y)
    {
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = EntityStates.MOVING;
            entity.target = {x: x, y: y};
        }
    }
    harvest(id, targetId)
    {
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = EntityStates.HARVESTING;
            entity.target = findEntityByID(targetId); //can be null
        }
    }
    attack(id, targetId)
    {
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = EntityStates.ATTACKING;
            entity.target = findEntityByID(targetId); //can be null
        }
    }
    build(id, buildingType, x, y)
    {
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            //todo: create incomplete building given building type and locations
            let building;
            entity.state = EntityStates.BUILDING;
            entity.target = building;
        }
    }
}
function requestPlayer(game)
{
    if(players.length < maxPlayers)
    {
        let player = new Player(game);
        //todo: generate starting units
        return player;
    }
    return null;
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
    constructor(type, id, x, y, z, game)
    {
        this.type = type;
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this.game = game;
        this._update = () => { this.update(); };
        this.game.emitter.on("update", this._update);
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
            this.health = 3;
        }
        if(type=="fighter")
        {
            this.move = function(x,y,z)
            {
                this.state = "move"
                this.targetCoords = [x, y, z]
            }
            this.attack = function(targetID)
            {
                this.state = "attack";
                this.attackTargetID = targetID;
            }
            this.act = function() //run every tick
            {
                if(state == "attack")
                {
                    let target = getEntityById(this.attackTargetID);
                    let diffX = this.x - target.x;
                    let diffY = this.y - target.y;
                    if(diffX + diffY < 2)
                    {
                        let theta = Math.atan(diffY/diffX);
                        let deltaX = 3 * Math.cos(theta);
                        let deltaY = 3 * Math.sin(theta);
                        this.move(this.x + deltaX, this.y + deltaY, this.z)
                    } else 
                    {
                        target.health += -1;
                    }
                    
                }
                if(state == "move")
                {
                    let diffX = this.x - targetCoords[0];
                    let diffY = this.y - targetCoords[1];
                    let theta = Math.atan(diffY/diffX);
                    let deltaX = 3 * Math.cos(theta);
                    let deltaY = 3 * Math.sin(theta);
                    this.move(this.x + deltaX, this.y + deltaY, this.z)
                }
            }
            this.attackTargetID = null;
            this.health = 5;
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
    destroy()
    {
        this.emitter.emit("destroy");
        this.game.emitter.removeListener("update", this._update);
        this.emitter.removeAllListeners();
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
        this.emitter = new EventEmitter();
    }
    //input int id, str type, arr action
    //call appropriate update function based on type
    updateEnt(id, type, action){
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
    updateUnit(id, action){

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
    updateHouse(id, action){

        let ent = getEntityById(id);

        if(action[0] == "makeWorker"){
            ent.makeWorker(action[1])
        }
    }
    //input int id, arr action
    //update ent list based on action
    updateCave(id, action){

        ent = getEntityById(id) 

        if(action[0] == "changeResources"){
            ent.changeResources(action[1])
        }
    }
    update()
    {
        this.emitter.emit("update");
    }
}
function update(gameBoard)
{
    gameBoard.update();
}
var _this = this;
module.exports = {
    GameBoard: GameBoard,
    requestPlayer: requestPlayer,
    game: {
        update: update,
        requestPlayer: requestPlayer,
        getMap: function() { return map; },
        getSideLength: function() { return tileSideLength; },
        requestId: requestId,
        Entity: Entity,
        emitter: emitter
    }
};