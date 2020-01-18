/**
 * manages event emitting and listening
 * can add listeners to events, and those events can be triggered
 */
class EventEmitter
{
    /**
     * creates a new event emitter
     */
    constructor()
    {
        this.events = {};
        this.addEventListener = this.on;
    }
    /**
     * adds a listener to be called when the given event is triggered
     * @param {string} name the name of the event
     * @param {function} action the listener to be called
     */
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
    /**
     * triggers all listeners associated with the given event
     * @param {*} name name of the event to trigger
     * @param  {...any} args any arguments to be passed along to the listeners
     */
    emit(name, ...args)
    {
        if(!this.events.hasOwnProperty(name))
        {
            return;
        }
        let event = this.events[name];
        for(let i = 0; i < event.length; i++)
        {
            let listener = event[i];
            listener(...args);
        }
    }
    /**
     * removes the given listener from the given event
     * @param {string} name event to remove action from
     * @param {function} action the action to remove
     */
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
    /**
     * removes all listeners
     */
    removeAllListeners()
    {
        this.events = {};
    }
}
try //in case we're running this in a browser
{
    module.exports = EventEmitter;
}
catch(e)
{
    //
}