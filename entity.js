const EventEmitter = require("./eventemitter.js");
/**
 * Entity is a class used to keep track of all of the different things in the game
 * Can be a house, worker, fighter, or cave
 * Has many properties that keep track of important game things (like position, the entity's owner, the health, etc.)
 */
class Entity
{
    /**
     * creates an entity
     * @param {string} type the type of entity
     * @param {number} id id number
     * @param {number} x x pos
     * @param {number} y y pos
     * @param {number} z height
     * @param {GameBoard} game a reference to the game world
     * @param {Player} owner a reference to the player owner of this entity
     */
    constructor(type, id, x, y, z, game, owner)
    {
        this.type = type;
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this.game = game;
        this.owner = owner;
        
        /**
         * radius of this entity
         */
        this.radius = 1;
        /**
         * if this entity has changed positions since the last time the updates were transmitted to the client
         */
        this.hasUpdates = false;
        /**
         * number of game ticks to not do anything
         */
        this.waitSteps = 0;
        /**
         * pixels per tick to move
         */
        this.moveSpeed = 1;
        /**
         * distance before entity stops moving toward target
         */
        this.stopMoveRadius = 1;
        /**
         * distance before entity stops moving towards harvest target
         */
        this.stopMoveHarvestRadius = 32;
        /**
         * distance before entity stops moving towards victim
         */
        this.stopMoveAttackRadius = 20;
        /**
         * amount of damage entity does to a victim
         */
        this.damage = 1;
        /**
         * number of game ticks between attacks
         */
        this.damageCooldownMax = 60;
        /**
         * current number of game ticks before the next attack
         */
        this.damageCooldown = 0;
        /**
         * amount of health that the entity has
         */
        this.health = 5;
        /**
         * event emitter to emit events about the entity
         */
        this.emitter = new EventEmitter();
        /**
         * the current state that the entity has
         */
        this.state = Entity.States.IDLE;
        /**
         * the entities target
         */
        this.target = null;
        
        var _this = this;
        //get onto the game's update loop so that we can update ourselves
        this._update = () => { _this.update(); };
        this._oupdate = this.update;
        this.game.emitter.on("update", this._update);
        //Different construction depending on what type of entity it is
        if(type=="worker")
        {
            this.health = 6;
            this.damage = 1;
            this.radius = 5;
            this.moveSpeed = 0.2;
            /**
             * if we are carrying something from the cave
             */
            this.carrying = false;
            this.targetHouse = null;
        }
        else if(type=="fighter")
        {
            this.health = 7;
            this.moveSpeed = 0.5;
            this.damage = 3;
            this.radius = 7;
        }
        else if(type=="house")
        {
            this.health = 30;
            // this.isBigHouse = false;
            // this.isBase = false;
            this.radius = 20;
            this.moveSpeed = 0;
            let mapSideLength = 1280
            // if((this.x == 300 && this.y == mapSideLength - 300) || (this.x == mapSideLength - 300 && this.y == 300)){
            //     this.isBigHouse = true;
            //     this.isBase = true;
            // }
        }
        else if(type=="cave")
        {
            this.health = 50;
            /**
             * number of resources before the cave can no longer be used
             */
            this.resourcesLeft = 1000000;
            this.changeResources = function(amt)
            {
                this.resourcesLeft += amt;
            };
        }
    }
    /**
     * Move takes the entity and moves it towards a target, which is either another entity, or a position
     * Move also includes code to manage collisions between entities so that they do not get stuck in one another
     */
    move()
    {
        if(this.target == null) return false; //can't move to a nonexistant target
        if(this.moveSpeed == 0) return true; //can't move if we have no speed
        let diffX = this.target.x - this.x;
        let diffY = this.target.y - this.y;
        let distSqr = diffX ** 2 + diffY ** 2;
        let dist = Math.sqrt(distSqr);
        let deltaX = (diffX / dist) * this.moveSpeed;
        let deltaY = (diffY / dist) * this.moveSpeed;
        let lastPosX = this.x, lastPosY = this.y;
        this.x += deltaX;
        this.y += deltaY;
        let collidedEnts = this.detectCollisions(this.x, this.y);
        for(let i = 0; i < collidedEnts.length; i++)
        {
            let ent = collidedEnts[i];
            let sqrDist = (this.x - ent.x)**2 + (this.y - ent.y)**2;
            let minSqrDist = (this.radius + ent.radius)**2;
            if(sqrDist < minSqrDist)
            {
                let actualDist = Math.sqrt(sqrDist);
                let minDist = this.radius + ent.radius;
                let correctionDist = actualDist - minDist;
                let ux = (ent.x - this.x)/actualDist;
                let uy = (ent.y - this.y)/actualDist;
                this.x += correctionDist*ux;
                this.y += correctionDist*uy;
            }
        }
        if(this.x > this.game.mapSideLength) this.x = this.game.mapSideLength;
        if(this.y > this.game.mapSideLength) this.y = this.game.mapSideLength;
        if(this.x < 0) this.x = 0;
        if(this.y < 0) this.y = 0;
        this.hasUpdates = true;
        this.emitter.emit("update", lastPosX, lastPosY);
        return true;
    }
    /**
     * Called every game tick, figures out what the entity is currently doing, and then does that
     */
    update()
    {
        if(this.waitSteps > 0)
        {
            this.waitSteps--;
            return;
        }
        let targetDistSqr = Infinity;
        if(this.target != null)
        {
            let diffX = this.target.x - this.x;
            let diffY = this.target.y - this.y;
            targetDistSqr = diffX ** 2 + diffY ** 2;
        }
        if(this.state === Entity.States.ATTACKING)
        {
            let tradius = 0;
            if(typeof this.target !== "undefined" && this.target != null && typeof this.target.radius === "number")
            {
                tradius = this.target.radius;
            }
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
        else if(this.state === Entity.States.MOVING)
        {
            let tradius = 0;
            if(typeof this.target !== "undefined" && this.target != null && typeof this.target.radius === "number")
            {
                tradius = this.target.radius;
            }
            if(targetDistSqr > (this.stopMoveRadius + this.radius + tradius) ** 2)
            {
                this.move();
            }
        }
        else if(this.state === Entity.States.HARVESTING)
        {
            if(this.type === "worker")
            {
                if(!this.carrying)
                {
                    this.targetHouse = null;
                    if(targetDistSqr > this.stopMoveHarvestRadius ** 2)
                    {
                        this.move();
                    }
                    else
                    {
                        this.carrying = true;
                        if(this.target.type == "cave")
                        {
                            this.target.changeResources(-1); //todo: make variable
                        }
                        this.waitSteps = 60; //todo: make variable
                    }
                }
                else
                {
                    if(this.targetHouse == null){
                        let minDistance = Infinity;
                        for(let i = 0; i < this.owner.ownedEntities.length; i++)
                        {
                            let ent = this.owner.ownedEntities[i];
                            if((ent.type === "house" && ent.owner === this.owner) && (ent.x-this.x)**2 + (ent.y-this.y)**2 < minDistance)
                            {
                                this.targetHouse = ent;
                                minDistance = (ent.x-this.x)**2 + (ent.y-this.y)**2;
                            }
                        }
                    }
                    if(this.targetHouse != null)
                    {
                        let targetCave = this.target;
                        this.target = this.targetHouse;
                        let diffX = this.target.x - this.x;
                        let diffY = this.target.y - this.y;
                        targetDistSqr = diffX ** 2 + diffY ** 2;
                        if(targetDistSqr > this.stopMoveHarvestRadius ** 2)
                        {
                            this.move();
                        }
                        else
                        {
                            this.owner.resources += 1; //todo: make variable
                            this.carrying = false;
                            this.emitter.emit("resource");
                            this.waitSteps = 60; //todo: make variable
                        }
                        this.target = targetCave;
                    }
                }
            }
        }
    }
    /**
     * Destroys this entity and removes it from all applicable locations
     */
    destroy()
    {
        this.emitter.emit("destroy");
        this.game.emitter.removeListener("update", this._update);
        this.emitter.removeAllListeners();
        this.game.removeEntity(this);
        if(typeof this.owner === "object")
        {
            for(let i = this.owner.ownedEntities.length - 1; i >= 0; i--)
            {
                let ent = this.owner.ownedEntities[i];
                if(ent == this)
                {
                    this.owner.ownedEntities.splice(i, 1);
                }
            }
        }
        if(this.type === "house")
        {
            try
            {
                let otherPlayer = this.owner.getOpposingPlayer();
                console.log(otherPlayer.checkWin());
            }
            catch(e)
            {
                debugger;
            }
        }
    }
    /**
     * Detects collisions with all nearby entities at a given x and y location
     */
    detectCollisions(checkX, checkY)
    {
        return this.game.checkCollision({ x: checkX, y: checkY, radius: this.radius, id: this.id });
    }
    /**
     * Does damage to this entity, possibly killing it
     */
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
/**
 * Different things that the entity can currently be doing. They are pretty self-explanatory
 */
Entity.States = {
    IDLE: 0,
    MOVING: 1,
    ATTACKING: 2,
    HARVESTING: 3,
    BUILDING: 4
};
module.exports = Entity;