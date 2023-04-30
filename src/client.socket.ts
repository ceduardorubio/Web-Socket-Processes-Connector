import { WebSocket } from 'ws';
import { SocketFn, SocketListeners, SocketPackage, SocketPackageData, SocketPackageInfo, SocketPackageResponse, SocketServerCallsStack } from './interfaces';

export const CreateClientSocket = (url:string,authData:SocketPackageData,onLogin:SocketFn,onError:(data:any) => void = console.error) => {
    let   webSocket:WebSocket               = new WebSocket(url);;
    let   packageID:number                  = 0;
    let   session  :SocketPackageData       = null;
    const calls    :SocketServerCallsStack  = {};
    const listeners:SocketListeners         = {};

    webSocket.on('error', e => {
        session = null;
        onError(e);
    });
    webSocket.on('close', e => {
        session = null;
        onError(e);
    });

    const AuthLoginServer = (cb:SocketFn) => {
        let info: SocketPackageInfo = {
            action   : 'auth',
            request  : 'login',
            group    : null,
            packageID: packageID
        }
        let obj:SocketPackage = {
            data:authData,
            info:info
        }
        calls[packageID] = cb;
        webSocket.send(JSON.stringify(obj));
        packageID++;
    }

    webSocket.on('open', () => { // START HERE !!!
        AuthLoginServer((error,sessionData) => { 
            if(error){
                session = null;
                onLogin(error,null);

            } else {
                session = sessionData;
                onLogin(null,sessionData);
            }
        });
    });

    webSocket.on('message', function incoming(incomingData:string) {
        try {
            let r:SocketPackageResponse = JSON.parse(incomingData);
            let { info,error,response } = r;
            if(info.action == "broadcast"){
                let { request } = info;
                if(listeners[request]) listeners[request].forEach(fn => fn(error,response));
            } else {
                if(info.action == "call" || info.action == "group" || info.action == "auth"){
                    let { packageID } = info;
                    if(calls[packageID]){
                        calls[packageID](error,response);
                        delete calls[packageID];
                    }
                }
            }
        } catch (e) {
            onError( 'invalid data: ' + incomingData);
        }
    });

    const MakeRequest = (request:string | number,data:SocketPackageData,cb:SocketFn) => {
        if(session){
            let info: SocketPackageInfo = {
                action   : 'call',
                request  : request,
                group    : null,
                packageID: packageID
            }
            let obj:SocketPackage = {
                data:data,
                info:info
            }
            calls[packageID] = cb;
            webSocket.send(JSON.stringify(obj));
            packageID++;
        } else {
            cb('not authenticated',null);
        }
    }

    const JoinGroup = (group:string,cb:SocketFn) => {
        if(session){
            let info: SocketPackageInfo = {
                action   : 'group',
                request  : 'join',
                group    : group,
                packageID: packageID
            }
            let obj:SocketPackage = {
                data:null,
                info:info
            }
            calls[packageID] = cb;
            webSocket.send(JSON.stringify(obj));
            packageID++;
        } else {
            cb('not authenticated',null);
        }
    }

    const LeaveGroup = (group:string,cb:SocketFn) => {
        if(session){
            let info: SocketPackageInfo = {
                action   : 'group',
                request  : 'leave',
                group    : group,
                packageID: packageID
            }
            let obj:SocketPackage = {
                data:null,
                info:info
            }
            calls[packageID] = cb;
            webSocket.send(JSON.stringify(obj));
            packageID++;
        } else {
            cb('not authenticated',null);
        }
    }

    const LeaveAllGroups = (cb:SocketFn) => {
        if(session){
            let info: SocketPackageInfo = {
                action: 'group',
                request: 'leaveAll',
                group: null,
                packageID: packageID
            }
            let obj:SocketPackage = {
                data:null,
                info:info
            }
            calls[packageID] = cb;
            webSocket.send(JSON.stringify(obj));
            packageID++;
        } else {
            cb('not authenticated',null);
        }
    }

    const On = (name:string,cb:SocketFn) => {
        if(!listeners[name]) listeners[name] = [];
        listeners[name].push(cb);
    }

    const Logout = (cb:SocketFn) => {
        let info: SocketPackageInfo = {
            action   : 'auth',
            request  : 'logout',
            group    : null,
            packageID: packageID
        }
        let obj:SocketPackage = {
            data:null,
            info:info
        }
        calls[packageID] = cb;
        webSocket.send(JSON.stringify(obj));
        packageID++;
    }

    return { MakeRequest,JoinGroup,LeaveGroup,LeaveAllGroups,On,Logout }
}