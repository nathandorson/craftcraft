var EventEmitter = require("./eventemitter.js");
var Entity = require("./entity.js");

//if speed is cared about, comparison between squared
//distances is faster than comparison between real distances
//also the '^' operator doesn't do what you think it does,
//which is why the '**' operator exists
function distanceToSqr(a, b)
{
    return (a.x - b.x)**2 + (a.y - b.y)**2;
}
function distanceTo(a, b)
{
    return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
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
        if(entity != null)
        {
            this.ownedEntities.push(entity);
        }
        this.game.entityList.push(entity);
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
            entity.state = Entity.States.MOVING;
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
            target = this.game.findEntityByID(targetId);
        }
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = Entity.States.HARVESTING;
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
            target = this.game.findEntityByID(targetId);
        }
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            entity.state = Entity.States.ATTACKING;
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
            entity.state = Entity.States.BUILDING;
            entity.target = building;
        }
    }
}

class GameBoard
{
    constructor()
    {
        this.emitter = new EventEmitter();
        this.entityList = [];
        this.players = [];
        this.maxPlayers = 2;
        this.highestId = 0;
        this.mapSideLength = 20 * 64;
        this.tileSideLength = 64;
        this.generateMap();
        for(let i = 0; i < 3; i++){
            let x = Math.random() * 1024;
            let y = Math.random() * 1024;
            Player.addEntity("cave", i, x, y, 1, game, -1)
        }
    }
    generateMap()
    {
        this.map = [];
        for(let r = 0; r < this.mapSideLength; r += this.tileSideLength)
        {
            let row = [];
            for(let c = 0; c < this.mapSideLength; c += this.tileSideLength)
            {
                row.push({"type":"ground","height":r+c})
            }
            this.map.push(row);
        }
    }
    update()
    {
        for(let i = 0; i < this.entityList.length; i++)
        {
            this.entityList[i].update();
        }
        this.emitter.emit("update");
    }
    requestId()
    {
        return this.highestId++;
    }
    requestPlayer(game)
    {
        if(this.players.length < this.maxPlayers)
        {
            let player = new Player(game);
            //todo: generate starting units
            return player;
        }
        return null;
    }
    findEntityByID(id)
    {
        for(let i = 0; i < this.entityList.length; i++)
        {
            let entity = this.entityList[i];
            if(entity.id == id)
            {
                return entity;
            }
        }
        return null;
    }
    getEntityList(player, getAll)
    { 
        if(getAll)
        {
            return this.entityList;
        }
        let ret = [];
        for(let i = 0; i < this.entityList.length; i++)
        {
            if(this.entityList[i].player == player)
            {
                ret.push(this.entityList[i]);
            }
            else
            {
                for(let z = 0; z < this.entityList.length; z++)
                {
                    if(this.entityList[z].player == player && distanceTo(this.entityList[z], this.entityList[i]) < 100){
                        ret.push(this.entityList[i])
                        break;
                    }
                }
            }
        }
        return ret;
    }
    removePlayer(player)
    {
        this.players.splice(this.players.indexOf(player), 1);
    }
}
module.exports = GameBoard;