import { WebSocket } from 'ws';
import { SocketFn, SocketListeners, SocketPackage, SocketPackageData, SocketPackageInfo, SocketPackageResponse, SocketServerCallsStack } from './interfaces';

process.on('uncaughtException', function (err) { console.log(err);});

export const CreateClientSocket = (url:string,authData:SocketPackageData,onLogin:SocketFn,onError:(data:any) => void = console.error) => {
    let ws:WebSocket                     = new WebSocket(url);
    let packageID:number                 = 0;
    let session  :SocketPackageData      = null;
    let calls    :SocketServerCallsStack = {};
    let listeners:SocketListeners        = {};

    const ReConnect = () => {
        setTimeout(() => {
            console.log('reconnecting...');
            try {
                ws = new WebSocket(url);
                packageID  = 0;
                session    = null; 
                calls      = {};
                listeners  = {};
                AppendListeners();
            } catch(e){
                console.log('error reconnecting...');
                console.log(e);
            }
        },2_000);
    }

    const AppendListeners = () =>{
        ws.on('error', e => {
            console.log('error...');
            onError(e);
            setTimeout(() => { ReConnect(); }, 2_000);
            ws.terminate();
            ws.removeAllListeners();
        });

        ws.on('close', e => {
            onError(e);
            setTimeout(() => { ReConnect(); }, 2_000);
            ws.terminate();
            ws.removeAllListeners();
        });
        
        ws.on('open', () => { // START HERE !!!
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
    
        ws.on('message', function incoming(incomingData:string) {
            try {
                let r:SocketPackageResponse = JSON.parse(incomingData);
                let { info,error,response } = r;
                let { action ,request, packageID ,group} = info;
                if(action == "broadcast"){
                    if(listeners[request]) listeners[request].forEach(fn => fn(error,response));
                } else {
                    if(action == "call" || action == "group" || action == "auth"){
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
    }

    AppendListeners();

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
        ws.send(JSON.stringify(obj));
        packageID++;
    }

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
            ws.send(JSON.stringify(obj));
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
            ws.send(JSON.stringify(obj));
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
            ws.send(JSON.stringify(obj));
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
            ws.send(JSON.stringify(obj));
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
        ws.send(JSON.stringify(obj));
        packageID++;
    }

    return { MakeRequest,JoinGroup,LeaveGroup,LeaveAllGroups,On,Logout }
}