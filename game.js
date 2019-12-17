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

function distanceTo(ent1, ent2)
{
    return Math.sqrt((ent1.x - ent2.x)^2 + (ent1.y - ent2.y)^2);
}

var mapSideLength = 10 * 64;
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
        this.resources = 0;
    }
    findOwnEntityById(id)
    {
        for(let i = 0; i < this.ownedEntities.length; i++)
        {
            let ent = this.ownedEntities[i];
            if(ent.id == id)
            {
                return ent;
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
        entity.emitter.on("update", () => {
            _this.emitter.emit("update", entity);
        });
    }
    move(id, x, y)
    {
        let target;
        if(typeof x === "object")
        {
            target = x;
        }
        else
        {
            target = {x: x, y: y};
        }
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = EntityStates.MOVING;
            entity.target = {x: x, y: y};
        }
    }
    harvest(id, targetId)
    {
        let target;
        if(typeof targetId === "object")
        {
            target = targetId;
        }
        else
        {
            target = findEntityByID(targetId);
        }
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = EntityStates.HARVESTING;
            entity.target = target;
        }
    }
    attack(id, targetId)
    {
        let target;
        if(typeof targetId === "object")
        {
            target = targetId;
        }
        else
        {
            target = findEntityByID(targetId);
        }
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = EntityStates.ATTACKING;
            entity.target = target;
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
    constructor(type, id, x, y, z, game, owner)
    {
        this.type = type;
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this.game = game;
        this.owner = owner;
        
        this.moveSpeed = 1;
        this.stopMoveRadius = 1;
        this.stopMoveHarvestRadius = 20;
        this.stopMoveAttackRadius = 20;
        this.damage = 1;
        this.damageCooldownMax = 60;
        this.damageCooldown = 0;
        this.health = 5;
        this.emitter = new EventEmitter();
        var _this = this;
        this._update = () => { _this.update(); };
        this._oupdate = this.update;
        this.game.emitter.on("update", this._update);
        this.state = EntityStates.IDLE;
        this.target = null;
        if(type=="worker")
        {
            this.health = 3;
            this.damage = 1;
            this.radius = 5;
            this.carrying = false;
        }
        if(type=="fighter")
        {
            this.health = 5;
            this.moveSpeed = 2;
            this.damage = 2;
            this.radius = 7;
        }
        if(type=="house")
        {
            this.health = 30;
            this.isBigHouse = false;
            this.radius = 20;
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
            this.move = function() { };
        }
        if(type=="cave")
        {
            this.health = 50;
            this.resourcesLeft = 1000000;
            this.changeResources = function(amt)
            {
                this.resourcesLeft = amt;
            }
        }
    }
    move()
    {
        if(this.target == null) return false;
        let diffX = this.target.x - this.x;
        let diffY = this.target.y - this.y;
        let distSqr = diffX ** 2 + diffY ** 2;
        let dist = Math.sqrt(distSqr);
        let deltaX = (diffX / dist) * this.moveSpeed;
        let deltaY = (diffY / dist) * this.moveSpeed;
        if(!this.detectCollisions(this.x + deltaX, this.y + deltaY)){
            this.x += deltaX;
            this.y += deltaY;
            this.emitter.emit("update");
        }
        return true;
    }
    update()
    {
        let targetDistSqr = Infinity;
        if(this.target != null)
        {
            let diffX = this.target.x - this.x;
            let diffY = this.target.y - this.y;
            targetDistSqr = diffX ** 2 + diffY ** 2;
        }
        if(this.state === EntityStates.ATTACKING)
        {
            let tradius = 0;
            if(typeof this.target !== "undefined" && this.target != null && typeof this.target.radius === "number") tradius = this.target.radius;
            if(targetDistSqr > (this.stopMoveAttackRadius + this.radius + tradius) ** 2)
            {
                this.move();
            }
            else
            {
                if(this.target != null)
                {
                    if(this.target.health < 0)
                    {
                        this.target = null;
                    }
                    else
                    {
                        if(this.damageCooldown <= 0)
                        {
                            this.target.damageThis(this.damage);
                            this.damageCooldown = this.damageCooldownMax;
                        }
                        else
                        {
                            this.damageCooldown--;
                        }
                    }
                }
            }
        }
        else if(this.state === EntityStates.MOVING)
        {
            let tradius = 0;
            if(typeof this.target !== "undefined" && this.target != null && typeof this.target.radius === "number") tradius = this.target.radius;
            if(targetDistSqr > (this.stopMoveRadius + this.radius + tradius) ** 2)
            {
                this.move();
            }
        }
        else if(this.state === EntityStates.HARVESTING)
        {
            if(!this.carrying)
            {
                if(targetDistSqr > this.stopMoveHarvestRadius ** 2)
                {
                    this.move();
                }
                else
                {
                    this.carrying = true;
                    this.target.changeResources(-1)
                }
            }
            else
            {
                let minDistance = Infinity;
                for(let i = 0; i < entityList.length; i++)
                {
                    
                }
            }
        }
    }
    destroy()
    {
        this.emitter.emit("destroy");
        this.game.emitter.removeListener("update", this._update);
        this.emitter.removeAllListeners();
        entityList.splice(entityList.indexOf(this), 1);
    }
    detectCollisions(checkX, checkY)
    {
        let entityNum = entityList.length;
        for(var i = 0; i < entityNum; i++)
        {
            let selfRad = this.radius;
            let entCheck = entityList[i]
            let checkRad = entCheck.radius;
            if((Math.sqrt((entCheck.x - checkX) ** 2 + (entCheck.y - checkY) ** 2) <= (selfRad + checkRad) && entCheck != this))
            {
                return true;
            }
        }
        return false;
    }
    damageThis(amount)
    {
        this.health -= amount;
        if(this.health <= 0)
        {
            //we are dead
            this.destroy();
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

        let ent = findEntityByID(id)

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

        let ent = findEntityByID(id);

        if(action[0] == "makeWorker"){
            ent.makeWorker(action[1])
        }
    }
    //input int id, arr action
    //update ent list based on action
    updateCave(id, action){

        ent = findEntityByID(id) 

        if(action[0] == "changeResources"){
            ent.changeResources(action[1])
        }
    }
    update()
    {
        for(let i = 0; i < entityList.length; i++)
        {
            entityList[i].update();
        }
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
        getEntityList: function(player) { 
            let ret = [];
            for(let i = 0; i < entityList.length; i++)
            {
                if(entityList[i].player == player){ret.push(entityList[i])}
                else
                {
                    for(let z = 0; z < entityList.length; z++){
                        if(entityList[z].player == player && distanceTo(entityList[z], entityList[i]) < 100){
                            ret.push(entityList[i])
                            break;
                        }
                    }
                }
            }
            return ret;
        },
        requestId: requestId,
        Entity: Entity,
        emitter: emitter,
        findEntityByID: findEntityByID,
        removePlayer: function(player) { players.splice(players.indexOf(player), 1); }
    }
};