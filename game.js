var EventEmitter = require("./eventemitter.js");
var Entity = require("./entity.js");
var Quadtree = require("./quadtree.js");

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
var entityPrice = {
    worker: 10,
    fighter: 15,
    house: 100
};
var fogViewDistance = 100;
class Player
{
    constructor(game)
    {
        this.game = game;
        this.emitter = new EventEmitter();
        this.ownedEntities = [];
        this.resources = 130;
        this.visibleEnemies = [];
        this.updatedEntityList = [];
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
        let price = 0;
        if(typeof entityPrice[entity.type] !== "undefined")
        {
            price = entityPrice[entity.type];
        }
        if(this.resources < price)
        {
            return; //dont make it if the player does not have enough resources
        } //note, this will currently assume that any entity not in the price list is free
        if(entity != null)
        {
            this.ownedEntities.push(entity);
            this.changeResources(this.resources - price);
            var _this = this;
            entity.emitter.on("destroy", () => {
                _this.emitter.emit("destroy", entity, true);
            });
            entity.emitter.on("update", (lx, ly) => {
                _this.emitter.emit("update", entity);
                this.game.tree.moveItem(entity, lx, ly);
            });
            entity.emitter.on("resource", () => {
                _this.emitter.emit("resource", _this.resources, false);
            });
            this.game.addEntity(entity);
            this.emitter.emit("create", entity, false);
        }
        else
        {
            debugger;
        }
    }
    changeResources(newResources)
    {
        this.resources = newResources;
        this.emitter.emit("resource", this.resources, false);
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
            entity.target = target;
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
    }/*
    build(id, buildingType, x, y)
    {
        let entity = this.findOwnEntityById(id);
        if(entity != null)
        {
            let building;
            entity.state = Entity.States.BUILDING;
            entity.target = building;
        }
    }*/
    updateVisibleEnemies()
    {
        let newVisibleEnemies = [];
        let tempUpdatedEntities = [];
        for(let i = 0; i < this.ownedEntities.length; i++)
        {
            let entity = this.ownedEntities[i];
            let nearbyEntities = this.game.tree.getItemsIn((x, y, wid, hgt) => {
                return rectangleOverlapsCircle(x, y, x + wid, y + hgt, entity.x, entity.y, fogViewDistance);
            });
            for(let j = 0; j < nearbyEntities.length; j++)
            {
                let testEntity = nearbyEntities[j];
                if(testEntity.owner == this)
                {
                    continue;
                }
                //we have an entity that does not have us as the owner and is not already found
                //find if it is within distance
                if(distanceToSqr(entity, testEntity) < fogViewDistance ** 2)
                {
                    //it is within distance
                    binaryInsert(testEntity.id, newVisibleEnemies); //binaryInsert does not add duplicates as a note
                    if(testEntity.hasUpdates)
                    {
                        binaryInsert(testEntity.id, tempUpdatedEntities);
                    }
                }
            }
        }
        for(let i = 0; i < tempUpdatedEntities.length; i++)
        {
            let ent = this.game.findEntityByID(tempUpdatedEntities[i]);
            if(ent != null)
            {
                this.updatedEntityList.push(ent);
            }
            else
            {
                debugger;
            }
        }
        for(let i = 0; i < this.ownedEntities.length; i++)
        {
            let ent = this.ownedEntities[i];
            if(ent.hasUpdates)
            {
                this.updatedEntityList.push(ent);
            }
        }
        //find additions and removals
        let additions = getArrayChanges(newVisibleEnemies, this.visibleEnemies);
        let removals = getArrayChanges(this.visibleEnemies, newVisibleEnemies);
        this.visibleEnemies = newVisibleEnemies;
        //tell server those changes
        for(let i = 0; i < additions.length; i++)
        {
            this.emitter.emit("create", this.game.findEntityByID(additions[i]), false, this);
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
    getUpdatedEntities()
    {
        let entList = this.updatedEntityList;
        this.updatedEntityList = [];
        return entList;
    }
    destroy()
    {
        for(let i = 0; i < this.ownedEntities.length; i++)
        {
            let entity = this.ownedEntities[i];
            this.game.removeEntity(entity);
            console.log("destroying entity id " + entity.id);
        }
        this.game.removePlayer(this);
    }
    checkWin()
    {
        //currently set to win if you destroy all of the other player's houses
        let otherPlayer = this.getOpposingPlayer();
        let houseCount = 0;
        for(let i = 0; i < otherPlayer.ownedEntities.length; i++)
        {
            let ent = otherPlayer.ownedEntities[i];
            if(ent.type === "house")
            {
                houseCount++;
            }
        }
        if(houseCount == 0)
        {
            return true;
        }
        return false;
    }
    getOpposingPlayer()
    {
        for(let i = 0; i < this.game.players.length; i++)
        {
            let pl = this.game.players[i];
            if(pl != this) return pl;
        }
        return null;
    }
}
/**https://machinesaredigging.com/2014/04/27/binary-insert-how-to-keep-an-array-sorted-as-you-insert-data-in-it/
 * Example :
 * var a = [2,7,9];
 * binaryInsert(8, a);
 * 
 * It will output a = [2,7,8,9]
 * 
 */ //modified for ids
function binaryInsert(value, array, startVal, endVal){

	var length = array.length;
	var start = typeof(startVal) != 'undefined' ? startVal : 0;
	var end = typeof(endVal) != 'undefined' ? endVal : length - 1;//!! endVal could be 0 don't use || syntax
	var m = start + Math.floor((end - start)/2);
	
	if(length == 0){
		array.push(value);
		return;
	}

	if(value > array[end]){
		array.splice(end + 1, 0, value);
		return;
	}

    if(value < array[start])
    {
		array.splice(start, 0, value);
		return;
	}

	if(start >= end){
		return;
	}

	if(value < array[m]){
		binaryInsert(value, array, start, m - 1);
		return;
	}

	if(value > array[m]){
		binaryInsert(value, array, m + 1, end);
		return;
	}

	//we don't insert duplicates
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

function forCircle(x, y, radius, begin, end, steps, action)
{
    if(begin == end) return;
    let arcDist = end - begin;
    for(let i = 0; i < steps; i++)
    {
        let angle = begin + (i / (steps - 1)) * arcDist;
        action(x + Math.cos(angle) * radius, y - Math.sin(angle) * radius);
    }
}
//https://yal.cc/rectangle-circle-intersection-test/
function rectangleOverlapsCircle(rx1, ry1, rx2, ry2, cx, cy, cr)
{
    let dx = cx - Math.max(rx1, Math.min(cx, rx2));
    let dy = cy - Math.max(ry1, Math.min(cy, ry2));
    return (dx ** 2 + dy ** 2) < (cr ** 2);
}
class GameBoard
{
    constructor()
    {
        this.emitter = new EventEmitter();
        this.idMap = {};
        this.players = [];
        this.maxPlayers = 2;
        this.highestId = 0;
        this.tileSideLength = 64;
        this.tileSideCount = 20;
        this.mapSideLength = this.tileSideCount * this.tileSideLength;
        this.possibleSpawnLocations = [
            { x: this.mapSideLength - 160, y: 160 },
            { x: 160, y: this.mapSideLength - 160 }
        ];
        this.tree = new Quadtree(0, 0, this.mapSideLength, this.mapSideLength, null);
        this.generateMap();
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
        let _this = this;
        function createCave(x, y)
        {
            _this.addEntity(new Entity("cave", _this.requestId(), x, y, 1, _this, -1));
        }
        forCircle(132, 132, 100, Math.PI / 3, 4 * Math.PI / 3, 6, createCave);
        forCircle(this.mapSideLength - 132, this.mapSideLength - 132, 100, Math.PI * 4 / 3, Math.PI * 7 / 3, 4, createCave);
        forCircle(160, this.mapSideLength - 160, 128, Math.PI / 2, Math.PI * 2, 8, createCave);
        forCircle(this.mapSideLength - 160, 160, 128, -Math.PI / 2, Math.PI , 8, createCave);
    }
    update()
    {
        this.tree.forEach((entity) => { entity.update(); })
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
            let loc;
            if(this.possibleSpawnLocations.length > 0)
            {
                let locationInd = Math.floor(Math.random() * this.possibleSpawnLocations.length);
                loc = this.possibleSpawnLocations[locationInd];
                this.possibleSpawnLocations.splice(locationInd, 1);
            }
            else
            {
                loc = { x: Math.random() * this.mapSideLength, y: Math.random() * this.mapSideLength };
            }
            player.addEntity(new Entity("house", this.requestId(), loc.x, loc.y, 1, this, player));
            return player;
        }
        return null;
    }
    addEntity(ent)
    {
        this.tree.addItem(ent);
        this.idMap[ent.id] = ent;
    }
    removeEntity(ent)
    {
        if(typeof ent === "number")
        {
            ent = this.findEntityByID(ent);
        }
        this.tree.removeItem(ent);
        if(typeof this.idMap[ent.id] !== "undefined")
        {
            delete this.idMap[ent.id];
        }
    }
    findEntityByID(id)
    {
        if(typeof this.idMap[id] !== "undefined")
        {
            return this.idMap[id];
        }
        return null;
    }
    getEntityList(player, getAll)
    {
        let ret = [];
        if(getAll)
        {
            this.tree.forEach((entity) => { ret.push(entity); });
        }
        else
        {
            ret.push(...player.ownedEntities);
            ret.push(...player.visibleEnemies);
        }
        return ret;
    }
    removePlayer(player)
    {
        this.players.splice(this.players.indexOf(player), 1);
        console.log("removed player");
    }
    checkCollision(entity)
    {
        let nearbyEntities = this.tree.getItemsIn((x, y, wid, hgt) => {
            return rectangleOverlapsCircle(x, y, x + wid, y + hgt, entity.x, entity.y, fogViewDistance); //fogViewDistance technically arbitrary for this purpose. //todo: fix
        });
        for(let i = 0; i < nearbyEntities.length; i++)
        {
            let targetEntity = nearbyEntities[i];
            if(entity.id != targetEntity.id)
            {
                let distSqr = distanceToSqr(entity, targetEntity);
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