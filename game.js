var EventEmitter = require("./eventemitter.js");
var Entity = require("./entity.js");
var Quadtree = require("./quadtree.js");

//if speed is cared about, comparison between squared
//distances is faster than comparison between real distances
/**
 * gets the squared distance between two points
 * this is faster than finding the actual distance
 * @param {object} a a location
 * @param {number} a.x x pos
 * @param {number} a.y y pos
 * @param {object} b another location
 * @param {number} b.x x pos
 * @param {number} b.y y pos
 */
function distanceToSqr(a, b)
{
    return (a.x - b.x)**2 + (a.y - b.y)**2;
}
/**
 * gets the distance between two points
 * @param {object} a a location
 * @param {number} a.x x pos
 * @param {number} a.y y pos
 * @param {object} b another location
 * @param {number} b.x x pos
 * @param {number} b.y y pos
 */
function distanceTo(a, b)
{
    return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
}
/**
 * a list of prices for each buildable entity
 */
var entityPrice = {
    worker: 10,
    fighter: 15,
    house: 100
};
/**
 * the players' view distance
 */
var fogViewDistance = 100;
/**
 * manages a player in the game, and communication from the server to the game
 */
class Player
{
    /**
     * creates a new player
     * @param {GameBoard} game a reference to the game
     */
    constructor(game)
    {
        /**
         * a reference to the game
         */
        this.game = game;
        /**
         * the event emitter for this player
         */
        this.emitter = new EventEmitter();
        /**
         * a list of entities that this player owns
         */
        this.ownedEntities = [];
        /**
         * number of resources this player has
         * 100 for initial house placement, plus 30 for other units
         */
        this.resources = 130;
        /**
         * list of enemies visible by the player's units
         */
        this.visibleEnemies = [];
        /**
         * list of entities to send updates to the client for
         */
        this.updatedEntityList = [];
        //listen to update events so that we join the update loop
        var _this = this;
        this._update = () => { _this.update(); };
        this.game.emitter.on("update", this._update);
    }
    /**
     * finds an entity by id given they are owned by this player
     * @param {number} id the id of the entity
     * @returns {Entity} returns the entity, null if not found
     */
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
    /**
     * adds an entity to the game from the player
     * @param {Entity} entity the entity to add
     */
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
        if(entity.type == "worker" || entity.type == "fighter")
        {
            let minDistance = Infinity;
            let targetHouse = null;
            for(let i = 0; i < this.ownedEntities.length; i++)
            {
                let ent = this.ownedEntities[i];
                if((ent.type === "house" && ent.owner === entity.owner) && (ent.x-entity.x)**2 + (ent.y-entity.y)**2 < minDistance)
                {
                    targetHouse = ent;
                    minDistance = (ent.x-entity.x)**2 + (ent.y-entity.y)**2;
                }
            }
            if(targetHouse != null)
            {
                let totalDist = distanceTo(targetHouse, entity);
                if(totalDist > fogViewDistance)
                {
                    let ux = (entity.x - targetHouse.x) / totalDist;
                    let uy = (entity.y - targetHouse.y) / totalDist;
                    entity.x = targetHouse.x + ux * fogViewDistance;
                    entity.y = targetHouse.y + uy * fogViewDistance;
                }
            }
        }
        if(entity.type == "house")
        {
            //todo: make a general house finding function
            let minDistance = Infinity;
            let targetWorker = null;
            for(let i = 0; i < this.ownedEntities.length; i++)
            {
                let ent = this.ownedEntities[i];
                if((ent.type === "worker" && ent.owner === entity.owner) && (ent.x-entity.x)**2 + (ent.y-entity.y)**2 < minDistance)
                {
                    targetWorker = ent;
                    minDistance = (ent.x-entity.x)**2 + (ent.y-entity.y)**2;
                }
            }
            if(targetWorker != null)
            {
                let totalDist = distanceTo(targetWorker, entity);
                if(totalDist > 100)
                {
                    let ux = (entity.x - targetWorker.x) / totalDist;
                    let uy = (entity.y - targetWorker.y) / totalDist;
                    entity.x = targetWorker.x + ux * 100;
                    entity.y = targetWorker.y + uy * 100;
                }
            }
        }
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
    /**
     * changes the amount of resources and emits a resource update
     * @param {number} newResources amount of resources to change to
     */
    changeResources(newResources)
    {
        this.resources = newResources;
        this.emitter.emit("resource", this.resources, false);
    }
    /**
     * sets an entity's state and target to move to a location
     * @param {number} id the id of the entity to move
     * @param {number} x x pos of target location
     * @param {number} y y pos of target location
     */
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
    /**
     * set an entity's state and target to harvest a cave
     * @param {number} id the unit to affect
     * @param {number} targetId the target cave to harvest
     */
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
    /**
     * set an entity's state to attack the given target
     * @param {number} id the attacking unit's id
     * @param {number} targetId the victim's id
     */
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
    /**
     * updates the list of visible enemies, and sends and emits any changes for them
     */
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
    /**
     * function for update loop
     */
    update()
    {
        this.updateVisibleEnemies();
    }
    /**
     * gets the list of updated entities
     * @returns {Entity[]} list of updated entities
     */
    getUpdatedEntities()
    {
        let entList = this.updatedEntityList;
        this.updatedEntityList = [];
        return entList;
    }
    /**
     * destroys entities owned by this player and removes it from the game
     */
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
    /**
     * checks if this entity has won the game
     * @returns {boolean} if this player has won
     */
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
    /**
     * gets the other player on the map
     * @returns {Player} the opposing player
     */
    getOpposingPlayer()
    {
        return this.game.players[this.game.players.length - this.game.players.indexOf(this) - 1];
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
 /**
  * adds a value to a sorted array
  * @param {number} value value to add to array
  * @param {number[]} array array to add to
  * @param {number=} startVal the beginning value for searching
  * @param {number=} endVal the end value for searching
  */
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
//todo: the two following functions are slow. maybe find another solution in the code where they are called
/**
 * checks if an item is in an array
 * @param {any[]} arr array to look inside of
 * @param {any} item item to look for
 * @returns {boolean} if the item is in the array
 */
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
/**
 * gets a list of positive changes from source to destination array
 * @param {any[]} a source array
 * @param {any[]} b destination array
 * @returns {any[]} list of changes
 */
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
/**
 * generates a 2d array of white noise
 * @param {number} wid the width of the noise array
 * @param {number} hgt the height of the noise array
 * @returns {number[][]} 2d array of white noise
 */
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
/**
 * interpolates between two values with an alph
 * @param {number} x0 start value
 * @param {number} x1 end value
 * @param {number} alph amount of end value versus start value
 * @returns {number} the interpolated value
 */
function interpolateValues(x0, x1, alph) //float, float, float, returns float
{
    return x0 * (1 - alph) + alph * x1;
}
/**
 * smooths the given noise
 * @param {number[][]} baseNoise 2d array of noise
 * @param {number} octave the octave
 * @returns {number[][]} the 2d array of smoothened noise
 */
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
/**
 * generates perlin noise from base noise
 * @param {number[][]} baseNoise 2d noise array
 * @param {number} octaveCount number of octaves
 * @returns {number[][]} 2d array of perlin noise
 */
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
/**
 * mirrors a 2d array of values
 * @param {any[][]} arr the 2d array mirrored along the diagonal
 * @returns {any[][]} the mirrored (same reference as input) array
 */
function mirrorMapTerrain(arr) //destructive, but it isn't like we care about the missing half of the resulting map
{
    let wid = arr.length;
    let hgt = arr[0].length;
    for(let i = 0; i < wid; i++)
    {
        for(let j = i; j < hgt; j++)
        {
            //j, i intentionally flipped
            arr[j][i] = arr[i][j];
        }
    }
    return arr;
}
/**
 * runs a loop, stepping through an arc around a circle specified by the beginning and ending angles
 * @param {number} x the circle center x position
 * @param {number} y the circle center y position
 * @param {number} radius the radius of circle
 * @param {number} begin beginning angle of arc
 * @param {number} end ending angle of arc
 * @param {number} steps steps to divide arc into
 * @param {function} action function call for each step on the arc
 */
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
/**
 * checks if a rectangle overlaps a circle
 * @param {number} rx1 rectangle leftmost x
 * @param {number} ry1 rectangle topmost y
 * @param {number} rx2 rectangle rightmost x
 * @param {number} ry2 rectangle bottommost y
 * @param {number} cx circle center x
 * @param {number} cy circle center y
 * @param {number} cr circle radius
 * @returns {boolean} if the rectangle overlaps the circle
 */
function rectangleOverlapsCircle(rx1, ry1, rx2, ry2, cx, cy, cr)
{
    let dx = cx - Math.max(rx1, Math.min(cx, rx2));
    let dy = cy - Math.max(ry1, Math.min(cy, ry2));
    return (dx ** 2 + dy ** 2) < (cr ** 2);
}
/**
 * manages the game world
 */
class GameBoard
{
    /**
     * creates the game board
     */
    constructor()
    {
        /**
         * event emitter for the game
         */
        this.emitter = new EventEmitter();
        /**
         * map to easily find entities given their id
         */
        this.idMap = {};
        /**
         * list of players
         */
        this.players = [];
        /**
         * max players in the game at one time
         */
        this.maxPlayers = 2;
        /**
         * highest entity id (for id requesting, making sure that we dont use ids already in use)
         */
        this.highestId = 0;
        /**
         * length of the side of a single terrain tile
         */
        this.tileSideLength = 64;
        /**
         * number of tiles on a side of the terrain
         */
        this.tileSideCount = 20;
        /**
         * length of the terrain sides
         */
        this.mapSideLength = this.tileSideCount * this.tileSideLength;
        /**
         * list of possible spawn locations for players when they join
         */
        this.possibleSpawnLocations = [
            { x: this.mapSideLength - 160, y: 160 },
            { x: 160, y: this.mapSideLength - 160 }
        ];
        /**
         * quadtree for collision optimization
         */
        this.tree = new Quadtree(0, 0, this.mapSideLength, this.mapSideLength, null);
        this.tree.maxItems = 4;
        //generate the map
        this.generateMap();
    }
    /**
     * generates the terrain and initial entities on map
     */
    generateMap()
    {
        let whiteNoise = generateWhiteNoise(this.tileSideCount, this.tileSideCount);
        let perlinNoise = generatePerlinNoise(whiteNoise, 4);
        perlinNoise = mirrorMapTerrain(perlinNoise);
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
    /**
     * called every tick
     */
    update()
    {
        this.tree.forEach((entity) => { entity.update(); })
        this.emitter.emit("update");
    }
    /**
     * requests an id for an entity
     * @returns {number} a new id
     */
    requestId()
    {
        return this.highestId++;
    }
    /**
     * requests a player for a newly connected client
     * @returns {Player} the generated player; null if cannot create
     */
    requestPlayer()
    {
        if(this.players.length < this.maxPlayers)
        {
            let player = new Player(this);
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
            this.players.push(player);
            return player;
        }
        return null;
    }
    /**
     * adds an entity to the game world
     * @param {Entity} ent the entity to add
     */
    addEntity(ent)
    {
        this.tree.addItem(ent);
        this.idMap[ent.id] = ent;
    }
    /**
     * removes an entity from the game world
     * @param {(Entity|number)} ent an entity or id
     */
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
    /**
     * finds an entity given their id
     * @param {number} id the id of the entity to look for
     * @returns {Entity} the found entity; null if failed to find
     */
    findEntityByID(id)
    {
        if(typeof this.idMap[id] !== "undefined")
        {
            return this.idMap[id];
        }
        return null;
    }
    /**
     * gets an entity list, with fog of war affects if desired
     * @param {Player} player the player to find entities for
     * @param {boolean} getAll if we get all of the entities
     * @returns {Entity[]} list of entities
     */
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
    /**
     * removes a player from the game
     * @param {Player} player the player to remove
     */
    removePlayer(player)
    {
        this.players.splice(this.players.indexOf(player), 1);
        console.log("removed player");
    }
    /**
     * get a list of collisions against the given entity
     * @param {Entity} entity the entity to check for collisions from
     * @returns {Entity[]} list of entities the given entity collides with
     */
    checkCollision(entity)
    {
        let nearbyEntities = this.tree.getItemsIn((x, y, wid, hgt) => {
            return rectangleOverlapsCircle(x, y, x + wid, y + hgt, entity.x, entity.y, fogViewDistance); //fogViewDistance technically arbitrary for this purpose. //todo: fix
        });
        let collidedEntities = [];
        for(let i = 0; i < nearbyEntities.length; i++)
        {
            let targetEntity = nearbyEntities[i];
            if(entity.id != targetEntity.id)
            {
                let distSqr = distanceToSqr(entity, targetEntity);
                if(distSqr < (entity.radius + targetEntity.radius) ** 2)
                {
                    collidedEntities.push(targetEntity);
                }  
            }
        }
        return collidedEntities;
    }
}
module.exports = GameBoard;