class EventEmitter
{
    constructor()
    {
        this.events = {};
        this.addEventListener = this.on;
    }
    on(name, action)
    {
        if(this.events.hasOwnProperty(name))
        {
            this.events[name].push(action);
        }
        else
        {
            this.events[name] = [action];
        }
    }
    emit(name)
    {
        if(!this.events.hasOwnProperty(name))
        {
            return;
        }
        let args = [];
        for(let i = 1; i < arguments.length; i++)
        {
            args.push(arguments[i]);
        }
        let event = this.events[name];
        for(let i = 0; i < event.length; i++)
        {
            let listener = event[i];
            listener(...args);
        }
    }
    removeListener(name, action)
    {
        if(this.events.hasOwnProperty(name))
        {
            let actionList = this.events[name];
            for(let i = 0; i < actionList.length; i++)
            {
                if(actionList[i] == action)
                {
                    return actionList.splice(i, 1);
                }
            }
        }
    }
    removeAllListeners()
    {
        this.events = {};
    }
}
try
{
    module.exports = EventEmitter;
}
catch(e)
{
    //
}