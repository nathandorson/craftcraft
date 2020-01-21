//based on quadtree made for regenerativep/jsario
/**
 * a quadtree for collision optimization
 */
class Quadtree
{
    /**
     * creates a new quadtree
     * @param {number} x top left x pos
     * @param {number} y top left y pos
     * @param {*} width width of this node
     * @param {*} height height of this node
     * @param {*} parent parent of this node
     */
    constructor(x, y, width, height, parent)
    {
        /**
         * parent of this node
         */
        this.parent = parent;
        if(parent == null)
        {
            this.depth = 0;
        }
        else
        {
            this.depth = parent.depth + 1;
        }
        /**
         * list of children of this node; null if leaf node
         */
        this.children = null;
        /**
         * list of items in this node; null if not leaf node
         */
        this.items = null;
        /**
         * top left x position
         */
        this.x = x;
        /**
         * top left y position
         */
        this.y = y;
        /**
         * width of this node
         */
        this.width = width;
        /**
         * height of this node
         */
        this.height = height;
        /**
         * center x position of this node
         */
        this.widd2 = x + width / 2;
        /**
         * center y position of this node
         */
        this.hgtd2 = y + height / 2;
        /**
         * max depth for this node and subsequently created nodes
         */
        this.maxDepth = 32;
        /**
         * max items for this node and subsequently created nodes
         */
        this.maxItems = 1;
        this.triggered = false;
    }
    /**
     * adds an item to the tree
     * @param {object} item the item to add
     * @param {number} item.x the x position of the item
     * @param {number} item.y the y position of the item
     */
    addItem(item)
    {
        if(this.items != null)
        {
            this.items.push(item);
            if(this.items.length > this.maxItems)
            {
                this.split();
            }
        }
        else
        {
            if(this.children != null)
            {
                let child = 0;
                child |= item.x > this.widd2 ? 1 : 0;
                child |= item.y > this.hgtd2 ? 2 : 0;
                this.children[child].addItem(item);
            }
            else
            {
                this.items = [item];
            }
        }
    }
    /**
     * gets a list of the items with the given condition
     * @param {function} cond condition for a node to be considered (node's x, y, width, and height are passed down)
     * @returns {object[]} list of items
     */
    getItemsIn(cond)
    {
        this.triggered = false;
        if(cond(this.x, this.y, this.width, this.height))
        {
            if(this.children == null)
            {
                this.triggered = true;
                if(this.items == null)
                {
                    return [];
                }
                else
                {
                    return this.items;
                }
            }
            else
            {
                let items = [];
                for(let i = 0; i < this.children.length; i++)
                {
                    items.push(...this.children[i].getItemsIn(cond));
                }
                return items;
            }
            
        }
        return [];
    }
    /**
     * attempts to collapse this node
     */
    attemptCollapse()
    {
        let heldItems = 0;
        let items = null;
        if(this.children != null)
        {
            for(let i = 0; i < this.children.length; i++)
            {
                let child = this.children[i];
                if(child.items != null && child.items.length > 0)
                {
                    heldItems += 1;
                    items = child.items;
                }
                if(child.children != null)
                {
                    heldItems += 2;
                }
            }
        }
        if(heldItems < 2)
        {
            this.children = null;
            if(heldItems == 1)
            {
                this.items = items;
            }
        }
    }
    /**
     * removes an item from the quadtree
     * @param {object} item the item to remove
     * @param {number} item.x the x position of the item
     * @param {number} item.y the y position of the item
     */
    removeItem(item)
    {
        if(this.items == null || this.items.length == 0)
        {
            if(this.children != null)
            {
                let child = 0;
                if(item.x > this.widd2)
                {
                    if(item.y > this.hgtd2)
                    {
                        child = 3;
                    }
                    else
                    {
                        child = 1;
                    }
                }
                else if(item.y > this.hgtd2)
                {
                    child = 2;
                }
                this.children[child].removeItem(item);
            }
        }
        else
        {
            let itemInd = this.items.indexOf(item);
            if(itemInd >= 0)
            {
                this.items.splice(itemInd, 1);
                this.parent.attemptCollapse(); //if code breaks could be a bad implementation here by me, Nate
            }
        }
    }
    /**
     * moves an item that is already in the tree
     * @param {object} item the item to move
     * @param {number} item.x the x position of the item
     * @param {number} item.y the y position of the item
     * @param {*} prevX the previous x position of the item before it was moved
     * @param {*} prevY the previous y position of the item before it was moved
     */
    moveItem(item, prevX, prevY)
    {
        if(this.items == null || this.items.length == 0)
        {
            if(this.children != null)
            {
                let child = 0;
                if(prevX > this.widd2)
                {
                    if(prevY > this.hgtd2)
                    {
                        child = 3;
                    }
                    else
                    {
                        child = 1;
                    }
                }
                else if(prevY > this.hgtd2)
                {
                    child = 2;
                }
                this.children[child].moveItem(item, prevX, prevY);
            }
        }
        else
        {
            this.removeItem(item);
        }
        if(this.depth == 0)
        {
            this.addItem(item);
        }
    }
    /**
     * splits this node into 4 more children and passes the items down to them
     */
    split()
    {
        if(this.depth >= this.maxDepth)
        {
            return;
        }
        this.children = [];
        let wd2 = this.width / 2;
        let hd2 = this.height / 2;
        this.children[0] = new Quadtree(this.x, this.y, wd2, hd2, this);
        this.children[1] = new Quadtree(this.x + wd2, this.y, wd2, hd2, this);
        this.children[2] = new Quadtree(this.x, this.y + hd2, wd2, hd2, this);
        this.children[3] = new Quadtree(this.x + wd2, this.y + hd2, wd2, hd2, this);
        let items = this.items;
        this.items = null;
        for(let i = 0; i < items.length; i++)
        {
            this.addItem(items[i]);
        }
    }
    /**
     * calls a function for each item in the entire tree
     * @param {function} fn the function to call; we pass the item
     */
    forEach(fn)
    {
        if(this.children != null)
        {
            try
            {
                for(let i = 0; i < this.children.length; i++)
                {
                    this.children[i].forEach(fn);
                }
            }
            catch(e)
            {
                //if we reach this, tree was likely changed after the if statement _somehow_
            }
        }
        if(this.items != null)
        {
            for(let i = 0; i < this.items.length; i++)
            {
                fn(this.items[i]);
            }
        }
    }
}

try
{
    module.exports = Quadtree;
}
catch(e)
{
    //
}
