const EventEmitter = require("./eventemitter.js");
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
        
        this.waitSteps = 0;
        this.moveSpeed = 1;
        this.stopMoveRadius = 1;
        this.stopMoveHarvestRadius = 32;
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
        this.state = Entity.States.IDLE;
        this.target = null;
        if(type=="worker")
        {
            this.health = 3;
            this.damage = 1;
            this.radius = 5;
            this.carrying = false;
            this.targetHouse = null;
        }
        else if(type=="fighter")
        {
            this.health = 5;
            this.moveSpeed = 2;
            this.damage = 2;
            this.radius = 7;
        }
        else if(type=="house")
        {
            this.health = 30;
            this.isBigHouse = false;
            this.isBase = false;
            this.radius = 20;
            this.moveSpeed = 0;
            this.attack = function(type)
            {
                if(type=="fighter")
                {

                }
                else if(type=="worker")
                {

                }
            };
            this.spawnUnit = function()
            {

            };
            let mapSideLength = 1280
            if((this.x == 300 && this.y == mapSideLength - 300) && (this.x == mapSideLength - 300 && this.y == 300)){
                this.isBigHouse = true;
                this.isBase = true;
            }
        }
        else if(type=="cave")
        {
            this.health = 50;
            this.resourcesLeft = 1000000;
            this.changeResources = function(amt)
            {
                this.resourcesLeft += amt;
            };
        }
    }
    move()
    {
        if(this.target == null) return false;
        if(this.moveSpeed == 0) return true;
        let diffX = this.target.x - this.x;
        let diffY = this.target.y - this.y;
        let distSqr = diffX ** 2 + diffY ** 2;
        let dist = Math.sqrt(distSqr);
        let deltaX = (diffX / dist) * this.moveSpeed;
        let deltaY = (diffY / dist) * this.moveSpeed;
        if(!this.detectCollisions(this.x + deltaX, this.y + deltaY)){
            this.x += deltaX;
            this.y += deltaY;
            if(this.x > this.game.mapSideLength) this.x = this.game.mapSideLength;
            if(this.y > this.game.mapSideLength) this.y = this.game.mapSideLength;
            if(this.x < 0) this.x = 0;
            if(this.y < 0) this.y = 0;
            this.emitter.emit("update");
        }
        return true;
    }
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
                        this.target.changeResources(-1);
                    }
                    this.waitSteps = 60;
                }
            }
            else
            {
                if(this.targetHouse == null){
                    let minDistance = Infinity;
                    for(let i = 0; i < this.game.entityList.length; i++)
                    {
                        let ent = this.game.entityList[i];
                        if((ent.type == "house" && ent.isFriendly) && Math.sqrt((ent.x-this.x)**2 + (ent.y-this.y)**2) < minDistance)
                        {
                            this.targetHouse = ent;
                            minDistance = Math.sqrt((ent.x-this.x)**2 + (ent.y-this.y)**2);
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
                        this.owner.resources += 1;
                        this.carrying = false;
                        this.emitter.emit("resource");
                        this.waitSteps = 60;
                    }
                    this.target = targetCave;
                }
            }
        }
    }
    destroy()
    {
        this.emitter.emit("destroy");
        this.game.emitter.removeListener("update", this._update);
        this.emitter.removeAllListeners();
        this.game.entityList.splice(this.game.entityList.indexOf(this), 1);
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
    }
    detectCollisions(checkX, checkY)
    {
        let entityNum = this.game.entityList.length;
        for(var i = 0; i < entityNum; i++)
        {
            let selfRad = this.radius;
            let entCheck = this.game.entityList[i]
            let checkRad = entCheck.radius;
            //todo: can use squared distance here
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
Entity.States = {
    IDLE: 0,
    MOVING: 1,
    ATTACKING: 2,
    HARVESTING: 3,
    BUILDING: 4
};
module.exports = Entity;