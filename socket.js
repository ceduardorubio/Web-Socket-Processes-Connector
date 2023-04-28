import WebSocket, { WebSocketServer } from 'ws';

const stackFn = [];
let   authFn  = null;

const wss    = new WebSocketServer({ noServer: true });

function SetAuth(cb){
    authFn = cb;
}


wss.on('connection', function connection(ws, request, socket) {
    ws.on('error', console.error);
    ws.on('error', console.error);
    ws.on('pong', heartbeat);
    
    let count = 0;
    ws.isAlive = true;

    setTimeout(() => {
        if(!("sessionData" in ws)){
            ws.send('HTTP/1.1 401 Timeout\r\n\r\n');
            socket.destroy();
        }
    },3000);

    ws.on('message', function message(msg) {
        try {
            let obj = JSON.parse(msg);
            let { id, type, data } = obj;
            if (!(count > 0)) {
                count++;
                if (type === 'auth') {
                    authFn(data, function (error, sessionData) {
                        if(error){
                            ws.send('HTTP/1.1 401 Unauthorized\r\n\r\n');
                            socket.destroy();
                        } else {

                            ws['sessionData'] = {
                                session: sessionData,
                                groups: []
                            } 
                            ws.send(
                                JSON.stringify({
                                    id,
                                    type,
                                    error: false,
                                    data: 'logged in'
                                })
                            );
                        }

                    });
                } else {
                    ws.send('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy();
                }
            } else {
                let resp = function (data) {
                    ws.send(
                        JSON.stringify({
                            id,
                            type,
                            error: false,
                            data,
                        })
                    );
                };

                if(type == 'imIn'){
                    let {group} = data;
                    ws.sessionData.groups.push(group);
                    resp({response: 'you are in ' + group});
                } else {
                    if (type === 'imOut') {
                        let {group} = data;
                        let index = ws.sessionData.groups.indexOf(group);
                        if(index !== -1){
                            ws.sessionData.groups.splice(index,1);
                            resp({response: 'you are out of ' + group});
                        } else {
                            resp({response: 'you were not in ' + group});
                        }
                    } else {
                        let foundIndex = -1;
                        for (let i = 0; i < stackFn.length; i++) {
                            let { fnType } = stackFn[i];
                            if (fnType === type) {
                                foundIndex = i;
                            }
                        }
                        if (foundIndex !== -1) {
                            let fn = stackFn[foundIndex].fn;
                            fn(data, resp, ws.sessionData);
                        } else {
                            ws.send(
                                JSON.stringify({
                                    id,
                                    type,
                                    error: 'not found',
                                    data: null,
                                })
                            );
                        }
                    }
                }
            }
        } catch (e) {
            ws.send('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    });
});

function heartbeat() {
    this.isAlive = true;
}

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', function close() {
    clearInterval(interval);
});

function stackSocketListener(fnType, fn) {
    stackFn.push({
        fnType,
        fn,
    });
}

function setSocketBroadCast(name, group ,data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN && ("sessionData" in client)) {
            if(group){ 
                if(client.sessionData.groups.indexOf(group) > -1){
                    client.send(
                        JSON.stringify({
                            id: name,
                            type: 'broadcast',
                            error: false,
                            data,
                        })
                    );
                }
            } else {
                client.send(
                    JSON.stringify({
                        id: name,
                        type: 'broadcast',
                        error: false,
                        data,
                    })
                );
            }
            
        }
    });
}

function attachToServer(server){
    server.on('upgrade', function upgrade(request, socket, head) {
        socket.on('error', console.error);
        socket.removeListener('error', console.error);
        wss.handleUpgrade(request, socket, head, function done(ws) {
            wss.emit('connection', ws, request, socket);
        });
    });
} 

export  {
    attachToServer,
    stackSocketListener,
    setSocketBroadCast,
    SetAuth
}