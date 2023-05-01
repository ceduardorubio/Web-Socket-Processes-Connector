import { IncomingMessage, Server } from 'http';
import internal = require('stream');
import { WebSocketServer,WebSocket,OPEN } from 'ws';
import { AuthLoginFn, AuthLogoutFn, MiddlewareFn, SocketFn, SocketListeners, SocketPackage, SocketPackageData, SocketPackageInfo, SocketPackageResponse, SocketRouter, SocketServer, SocketServerCallsStack, SocketSession } from './interfaces';

export const CreateServerSocket = (server:Server,authClientLogin:AuthLoginFn,authClientLogout:AuthLogoutFn = null,timeAlive:number = 30_000,onSocketError:(e:any) => void = console.error) => {
    const websocketServer:WebSocketServer = new WebSocketServer({ noServer: true });
    const routes:SocketRouter      = {};
    let broadcastPackageID:number  = 0;

    server.on('upgrade',  (request:IncomingMessage, socketInternal:internal.Duplex, head:Buffer) => {
        socketInternal.on('error',onSocketError);
        socketInternal.removeListener('error', onSocketError);
        websocketServer.handleUpgrade(request, socketInternal, head,(websocket:WebSocket) => websocketServer.emit('connection',websocket,socketInternal));
    });

    websocketServer.on('connection',(websocket:WebSocket, socketInternal:internal.Duplex) => {
        const session:SocketSession = {
            isAlive: true,
            data   : null,
            groups : [],
        }
        websocket['xSession'] = session;

        setTimeout(() => (session.data !== null) || closeSocketInternal() ,timeAlive);
        websocket.on('error', onSocketError);
        websocket.on('pong', () => session.isAlive = true );

        const closeSocketInternal = () => socketInternal.destroy();

        websocket.on('message', (message : string) => {
            let { info, data } = JSON.parse(message) as SocketPackage;
            let { action, request ,group } = info;
            const SendToClient:SocketFn = (error:any,response:SocketPackageData ) => {
                let res: SocketPackageResponse = { info, error, response };
                websocket.send(JSON.stringify(res))
            }
            if (session.data){
               if(action === 'group'){
                    if(request === 'join'){
                        session.groups.push(group);
                        SendToClient(false,{done:true});
                    } else {
                        if(request === 'leave'){
                            session.groups = session.groups.filter(g => g !== group);
                            SendToClient(false,{done:true});
                        } else {
                            if(request === 'leaveAll'){
                                session.groups = [];
                                SendToClient(false,{done:true});
                            } else {
                                SendToClient('invalid request',{ done : false });
                            }
                        }
                    }
                } else {
                    if(action == 'call'){
                        if(routes[request]){
                            routes[request](data,SendToClient,session.data,session.groups);
                        } else {
                            SendToClient('invalid request',{ done : false });
                        }
                    } else {
                        if(action === 'auth'){
                            if(request === 'logout'){
                                if(authClientLogout) authClientLogout(session.data,SendToClient);
                                closeSocketInternal();
                            } else {
                                SendToClient('invalid request',{ done : false });
                            }
                        } else {

                            SendToClient('invalid action',{ done : false });
                        }
                    }
                }
            } else {
                if(action === 'auth'){
                    if( request === 'login'){
                        const setSession = sessionData => session.data = sessionData;
                        authClientLogin(data,setSession,closeSocketInternal,SendToClient);
                    } else {
                        closeSocketInternal();                        
                    }
                } else {
                    closeSocketInternal();
                }
            }
        });
    });

    const heartBeating = setInterval(() => {
        websocketServer.clients.forEach(ws => {
            if(ws['xSession'] === undefined) return ws.terminate();
            if (ws['xSession'].isAlive  === false) return ws.terminate();
            ws['xSession'].isAlive  = false;
            ws.ping();
        });
    }, timeAlive);

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

    const webSocketServer:SocketServer = {
        On:(type:string,cb:MiddlewareFn) => routes[type] = cb,
        Close: () => websocketServer.close(),
        Broadcast
    };

    return webSocketServer;
}
