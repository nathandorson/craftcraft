//initially based on quadtree made for regenerativep/jsario
class Quadtree
{
    constructor(x, y, width, height, parent)
    {
        this.parent = parent;
        if(parent == null)
        {
            this.depth = 0;
        }
        else
        {
            this.depth = parent.depth + 1;
        }
        this.children = null;
        this.items = null;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.widd2 = x + width / 2;
        this.hgtd2 = y + height / 2;
        this.maxDepth = 32;
        this.maxItems = 1;
        this.triggered = false;
    }
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
                //
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
