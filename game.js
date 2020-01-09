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
var fogViewDistance = 100;
class Player
{
    constructor(game)
    {
        this.game = game;
        this.emitter = new EventEmitter();
        this.ownedEntities = [];
        this.resources = 0;
        this.visibleEnemies = [];
        var _this = this;
        this._update = () => { _this.update(); };
        this.game.emitter.on("update", this._update);
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
        this.emitter.emit("create", entity, false);
        var _this = this;
        entity.emitter.on("destroy", () => {
            _this.emitter.emit("destroy", entity, true);
        });
        entity.emitter.on("update", () => {
            _this.emitter.emit("update", entity);
        });
        entity.emitter.on("resource", () => {
            _this.emitter.emit("resource", _this.resources, false);
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
    updateVisibleEnemies()
    {
        let newVisibleEnemies = [];
        let entityList = this.game.getEntityList(this, true);
        for(let i = 0; i < this.ownedEntities.length; i++)
        {
            let entity = this.ownedEntities[i];
            for(let j = 0; j < entityList.length; j++)
            {
                let testEntity = entityList[j];
                if(itemInArray(newVisibleEnemies, testEntity) || testEntity.owner == this)
                {
                    continue;
                }
                //we have an entity that does not have us as the owner and is not already found
                //find if it is within distance
                if((entity.x - testEntity.x)**2 + (entity.y - testEntity.y)**2 < fogViewDistance ** 2)
                {
                    //it is within distance
                    newVisibleEnemies.push(testEntity);
                }
            }
        }
        //find additions and removals
        let additions = getArrayChanges(newVisibleEnemies, this.visibleEnemies);
        let removals = getArrayChanges(this.visibleEnemies, newVisibleEnemies);
        this.visibleEnemies = newVisibleEnemies;
        //tell server those changes
        for(let i = 0; i < additions.length; i++)
        {
            this.emitter.emit("create", additions[i], false, this);
        }
        for(let i = 0; i < removals.length; i++)
        {
            this.emitter.emit("destroy", removals[i], false); //TODO: use separate commands that aren't "create" and "destroy"
        }
    }
    update()
    {
        this.updateVisibleEnemies();
    }
}
function itemInArray(arr, item)
{
    for(let i = 0; i < arr.length; i++)
    {
        if(arr[i] == item)
        {
            return true;
        }
    }
    return false;
}
function getArrayChanges(a, b)
{
    let changes = [];
    for(let i = 0; i < a.length; i++)
    {
        if(!itemInArray(b, a[i]))
        {
            changes.push(a[i]);
        }
    }
    return changes;
}

//http://devmag.org.za/2009/04/25/perlin-noise/
function generateWhiteNoise(wid, hgt)
{
    let noise = [];
    for(let i = 0; i < wid; i++)
    {
        let row = [];
        for(let j = 0; j < hgt; j++)
        {
            row.push(Math.random());
        }
        noise.push(row);
    }
    return noise;
}
function interpolateValues(x0, x1, alph) //float, float, float, returns float
{
    return x0 * (1 - alph) + alph * x1;
}
function generateSmoothNoise(baseNoise /*2d float array*/, octave /*int*/)
{
    let wid = baseNoise.length;
    let hgt = baseNoise[0].length;
    let smoothNoise = [];
    let samplePeriod = 1 << octave;
    let sampleFrequency = 1 / samplePeriod; //float
    for(let i = 0; i < wid; i++)
    {
        let sample_i0 = parseInt(i / samplePeriod) * samplePeriod;
        let sample_i1 = (sample_i0 + samplePeriod) % wid;
        let horizontal_blend = (i - sample_i0) * sampleFrequency; //float
        let row = [];
        for(let j = 0; j < hgt; j++)
        {
            let sample_j0 = parseInt(j / samplePeriod) * samplePeriod;
            let sample_j1 = (sample_j0 + samplePeriod) % hgt;
            let vertical_blend = (j - sample_j0) * sampleFrequency; //float
            let top = interpolateValues(baseNoise[sample_i0][sample_j0], baseNoise[sample_i1][sample_j0], horizontal_blend);
            let bottom = interpolateValues(baseNoise[sample_i0][sample_j1], baseNoise[sample_i1][sample_j1], horizontal_blend);
            row.push(interpolateValues(top, bottom, vertical_blend));
        }
        smoothNoise.push(row);
    }
    return smoothNoise;
}
function generatePerlinNoise(baseNoise /*2d float array*/, octaveCount /*int*/)
{
    let wid = baseNoise.length;
    let hgt = baseNoise[0].length;
    let smoothNoise = []; //3d array [octaveCount, wid, hgt]
    let persistance = 0.5;
    for(let i = 0; i < octaveCount; i++)
    {
        smoothNoise.push(generateSmoothNoise(baseNoise, i));
    }
    let perlinNoise = []; //2d float array
    for(let i = 0; i < wid; i++)
    {
        let row = [];
        for(let j = 0; j < hgt; j++)
        {
            row.push(0);
        }
        perlinNoise.push(row);
    }
    let amplitude = 1; //float
    let totalAmplitude = 0; //float
    for(let octave = octaveCount - 1; octave >= 0; octave--)
    {
        amplitude *= persistance;
        totalAmplitude += amplitude;
        for(let i = 0; i < wid; i++)
        {
            for(let j = 0; j < hgt; j++)
            {
                perlinNoise[i][j] += smoothNoise[octave][i][j] * amplitude;
            }
        }
    }
    for(let i = 0; i < wid; i++)
    {
        for(let j = 0; j < hgt; j++)
        {
            perlinNoise[i][j] /= totalAmplitude;
        }
    }
    return perlinNoise;
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
        this.tileSideLength = 64;
        this.tileSideCount = 20;
        this.mapSideLength = this.tileSideCount * this.tileSideLength;
        this.generateMap();
        let anotherNewCave = new Entity("cave", this.requestId(), 32, 32, 1, this, -1);
        this.entityList.push(anotherNewCave);
        for(let i = 0; i < 3; i++){
            let x = Math.random() * 1024;
            let y = Math.random() * 1024;
            let newCave = new Entity("cave", this.requestId(), x, y, 1, this, -1);
            this.entityList.push(newCave);
        }
    }
    generateMap()
    {
        let whiteNoise = generateWhiteNoise(this.tileSideCount, this.tileSideCount);
        let perlinNoise = generatePerlinNoise(whiteNoise, 4);

        this.map = [];
        for(let i = 0; i < this.tileSideCount; i++)
        {
            let row = [];
            for(let j = 0; j < this.tileSideCount; j++)
            {
                row.push({
                    type: "ground",
                    height: perlinNoise[i][j] * 256
                });
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
                    if(this.entityList[z].player == player && distanceTo(this.entityList[z], this.entityList[i]) < fogViewDistance){
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
    checkCollision(entity)
    {
        for(let i = 0; i < this.entityList.length; i++)
        {
            let targetEntity = this.entityList[i];
            if(entity != targetEntity)
            {
                let distSqr = (entity.x - targetEntity.x) ** 2 + (entity.y - targetEntity.y) ** 2;
                if(distSqr < (entity.radius + targetEntity.radius) ** 2)
                {
                    return true;
                }
            }
        }
        return false;
    }
}
module.exports = GameBoard;