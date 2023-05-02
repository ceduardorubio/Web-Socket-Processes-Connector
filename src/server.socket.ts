import { IncomingMessage, Server } from 'http';
import internal = require('stream');
import { WebSocketServer,WebSocket,OPEN } from 'ws';
import { AuthLoginFn, AuthLogoutFn, MiddlewareFn, SocketFn, SocketHttpRequestHandler, SocketPackage, SocketPackageData, SocketPackageInfo, SocketPackageResponse, SocketRouter, SocketServer, SocketSession } from './interfaces';

export const CreateServerSocket = (server:Server,onClientAuthenticationRequest:AuthLoginFn,onClientLogout:AuthLogoutFn = null,timeAlive:number = 3_000,onSocketError:(e:any) => void = console.error) => {
    const websocketServer    :WebSocketServer          = new WebSocketServer({ noServer: true });
    const routes             :SocketRouter             = {};                                        // routes are for calls. Empty
    let   broadcastPackageID :number                   = 0;
    let   startSessionTimeout:number                   = timeAlive * 0.75;                         // less than heartbeatInterval
    let   heartbeatInterval  :number                   = timeAlive;
    let   authLogout         :AuthLogoutFn             = onClientLogout;
    let   requestHandler    :SocketHttpRequestHandler = null;

    server.on('upgrade',  (request:IncomingMessage, socketInternal:internal.Duplex, head:Buffer) => {
        socketInternal.on('error',onSocketError);
        socketInternal.removeListener('error', onSocketError);
        const notGranted = () => socketInternal.destroy(); 
        const granted    = () => {
            websocketServer.handleUpgrade(request, socketInternal, head,(websocket:WebSocket) => {
                websocketServer.emit('connection',request,websocket,socketInternal)
            });
        }
        if ( requestHandler ) {
            requestHandler(request ,granted,notGranted);
        } else {
            granted();
        }  
    });

    websocketServer.on('connection',(httpRequest:IncomingMessage,websocket:WebSocket, socketInternal:internal.Duplex) => {
        const session:SocketSession = {
            isAlive: true,  // heartbeat
            data   : null,  // session data 
            groups : [],    // groups
        }
        websocket['xSession'] = session; // add session to websocket

        setTimeout  (() => (session.data !== null) || closeSocketInternal() ,startSessionTimeout);  // client has N seconds to authenticate or will be disconnected
        websocket.on('error', onSocketError);                                                       // error handler
        websocket.on('pong', () => session.isAlive = true );                                        // heartbeat set isAlive 
        const        closeSocketInternal = () => socketInternal.destroy();                          // close socket internal (at http level)

        websocket.on('message', (message : string) => {
            let { 
                info, // info about the package, so the package can be routed in server and the response can be tracked when it arrives to the client 
                data  // data sent by the client
            } = JSON.parse(message) as SocketPackage;
            let { 
                action ,  // internal action builtIn to be performed by the server. Example: group, call, auth, broadcast
                request,  // request or route to be performed by the server. Example: join, leave, echo, login, logout, etc
                group  ,  // group to be joined or leaved
            } = info;

            const SendToClient:SocketFn = (error:any,response:SocketPackageData ) => { // function definition to send response to client. Info is the same as was sent by the client
                let res: SocketPackageResponse = { info, error, response };
                websocket.send(JSON.stringify(res))
            }

            if (session.data){                                          // if the client is authenticated
               if(action === 'group'){
                    if(request === 'join'){                             // join a group
                        session.groups.push(group);
                        SendToClient(false,{done:true});
                    } else {
                        if(request === 'leave'){                        // leave a group
                            session.groups = session.groups.filter(g => g !== group);
                            SendToClient(false,{done:true});
                        } else {
                            if(request === 'leaveAll'){                 // leave all groups
                                session.groups = [];
                                SendToClient(false,{done:true});
                            } else {
                                SendToClient('invalid group request',{ done : false }); // invalid group request
                            }
                        }
                    }
                } else {
                    if(action == 'call'){
                        if(request == 'echo') {                         // built in echo. Sends back the data sent by the client. Test the connection 
                            SendToClient(false,{ echoAt: new Date().getTime(), received:data});
                        } else {
                            if(Object.keys(request).length > 0){     // if there are routes defined
                                if(routes[request]){                   // if the route exists
                                    routes[request](data,SendToClient,session.data,session.groups); // call the route
                                } else {
                                    SendToClient('invalid call request',{ done : false });
                                }
                            } else {                                   // if there are no routes defined
                                SendToClient('invalid call. No routes defined',{ done : false });
                            }
                        }
                    } else {
                        if(action === 'auth'){
                            if(request === 'logout'){
                                if(authLogout) authLogout(session.data,SendToClient); // call the logout function
                                closeSocketInternal();
                            } else {
                                SendToClient('invalid auth request',{ done : false }); // invalid auth request
                            }
                        } else {

                            SendToClient('invalid action',{ done : false });
                        }
                    }
                }
            } else { // if the client is not authenticated
                if((action === 'auth') && (request === 'login')){ // if the client is trying to authenticate
                    const setSession = sessionData => session.data = sessionData;
                    onClientAuthenticationRequest(data,setSession,closeSocketInternal,SendToClient,httpRequest); // call the authentication function
                } else {
                    // if the client is not authenticated and is not trying to authenticate, close the socket
                    closeSocketInternal();                        
                }                     
            }
        });
    });

    const heartBeating = setInterval(() => {
        websocketServer.clients.forEach(ws => {
            if     (ws['xSession'] === undefined) return ws.terminate();       // if the client is not authenticated, close the socket
            if     (ws['xSession'].isAlive  === false) return ws.terminate();  // if the client is not responding to the heartbeat, close the socket
            ws     ['xSession'].isAlive  = false;                              // set the client as not responding to the heartbeat and wait for the next heartbeat
            ws.ping();                                                         // send the heartbeat
        });
    }, heartbeatInterval);

    websocketServer.on('close', () => clearInterval(heartBeating));
    
    const Broadcast = (name:string,group:string | null,data:SocketPackageData,emitter:WebSocket = null) => {
        broadcastPackageID++;
        let info: SocketPackageInfo = {  action: 'broadcast', request: name, group, packageID:broadcastPackageID  };
        let r : SocketPackageResponse = { info, error: false, response: data };
        let msg = JSON.stringify(r);
        websocketServer.clients.forEach((ws:WebSocket) => {
            if (ws.readyState === OPEN && ("xSession" in ws) && (ws !== emitter)) {
                if(group){
                    if(ws['xSession']['groups'].includes(group))  ws.send( msg);
                } else {
                    ws.send( msg);
                }                
            }
        });
    };

    const SetTimeoutForAuthenticationRequest = (time:number) => {
        startSessionTimeout = time;
        if(heartbeatInterval < time){
            heartbeatInterval = time * 1.5;
        }
    }
    const SetHeartbeatInterval = (time:number) => {
        heartbeatInterval = time;
        if(startSessionTimeout > time){
            startSessionTimeout = time * 0.75;
        }
    }
    const SetOnLogout = (logout:AuthLogoutFn) => {
        authLogout = logout;
    }

    const On = (requestOrRouteName:string,cb:MiddlewareFn) => {
        routes[requestOrRouteName] = cb
    };

    const Close = () => {
        websocketServer.close();
    }

    const SetRequestHandler = (httpRequestHandler:SocketHttpRequestHandler) => {
        requestHandler = httpRequestHandler;
    }

    /**
     * Alias for On
     */
    const OnRequest                          = On;
    /**
     * Alias for On
     */
    const SetRoute                           = On;
    /**
     * Alias for On
     */
    const SetCall                            = On;
    const webSocketServer:SocketServer       = {
        On,
        OnRequest,
        SetRoute,
        SetCall,
        Close,
        Broadcast,
        SetTimeoutForAuthenticationRequest,
        SetHeartbeatInterval,
        SetOnLogout,
        SetRequestHandler

    };

    OnRequest
    return webSocketServer;
}
