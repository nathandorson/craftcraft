var connected = false;
var ws = new WebSocket("ws://");
ws.onopen = function() {
    console.log("connected");
    ws.send(JSON.stringify({
        type: "register"
    }));
    connected = true;
    client.setSocket(ws);
};
ws.onclose = function() {
    console.log("disconnected");
    connected = false;
}
ws.onmessage = function(ev) {
    let data = JSON.parse(ev.data);
    if (data.type == "createUnit")
    {
        id = data.id;
    }
    if(data.type == "updateUnit")
    {
        id = data.id;
    }
    if(data.type == "destroyUnit")
    {
        id = data.id;
    }
}
function setup()
{
    createCanvas(512,512);
    background(255);
}
function draw()
{

}