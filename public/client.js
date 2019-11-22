var connected = false;
var ws = new WebSocket("ws://127.0.0.1:5524");
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
    if (data.type == "")
    {
        //
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