import { WebSocket } from 'ws';
import { SocketFn, SocketListeners, SocketPackage, SocketPackageData, SocketPackageInfo, SocketPackageResponse, SocketServerCallsStack } from './interfaces';

process.on('uncaughtException', function (err) { console.log(err);});

export const CreateClientSocket = (wssURL:string = null,authData:SocketPackageData = null,onLogin:SocketFn = null,onError:(data:any) => void = console.error) => {
    let url         :string                 = wssURL;
    let ws          :WebSocket              = (url != null && authData != null) ? new WebSocket(url) : null;
    let packageID   :number                 = 0;
    let session     :SocketPackageData      = null;
    let calls       :SocketServerCallsStack = {};
    let listeners   :SocketListeners        = {};
    let mainAuthData:SocketPackageData      = authData;
    let authFail    :boolean                = false;
    let onLoginFn   :SocketFn               = onLogin;

    const Connect = (t:number = 2_000) => {
        if(authFail) return;
        setTimeout(() => {
            try {
                if(ws) {
                    ws.terminate();
                    ws.removeAllListeners();
                }
                ws = new WebSocket(url);
                packageID  = 0;
                session    = null; 
                calls      = {};
                listeners  = {};
                AppendListeners();
            } catch(e){
                onError(e);
            }
        },t);
    }

    const AppendListeners = () =>{
        ws.on('error', e => {
            onError(e);
            setTimeout(() => { Connect(); }, 2_000);
            ws.terminate();
            ws.removeAllListeners();
        });

        ws.on('close', e => {
            onError(e);
            setTimeout(() => { Connect(); }, 2_000);
            ws.terminate();
            ws.removeAllListeners();
        });
        
        ws.on('open', () => { // START HERE !!!
            let obj = GetAuthPackage(mainAuthData,packageID);
            Send(obj,(error,sessionData) => { 
                if(error){
                    authFail = true;
                    session = null;
                    onLoginFn(error,null);                    
                } else {
                    authFail = false;
                    session = sessionData;
                    onLoginFn(null,sessionData);
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
                    if((action == "call" || action == "group" || action == "auth") && calls[packageID] ){
                        calls[packageID](error,response);
                        delete calls[packageID];
                    }
                }
            } catch (e) {
                onError( 'invalid data: ' + incomingData);
            }
        });
    }

    if (ws) AppendListeners();

    const MakeRequest = (request:string | number,data:SocketPackageData,cb:SocketFn) => {
        if(session){
            let obj = GetMakeRequestPackage(request,data,packageID);
            Send(obj,cb);
        } else {
            cb('not authenticated',null);
        }
    }

    const JoinGroup = (group:string,cb:SocketFn) => {
        if(session){
            let obj = GetJoinGroupPackage(group,packageID);
            Send(obj,cb);
        } else {
            cb('not authenticated',null);
        }
    }

    const LeaveGroup = (group:string,cb:SocketFn) => {
        if(session){
            let obj = GetLeaveGroupPackage(group,packageID);
            Send(obj,cb);
        } else {
            cb('not authenticated',null);
        }
    }

    const LeaveAllGroups = (cb:SocketFn) => {
        if(session){
            let obj = GetLeaveAllGroupsPackage(packageID);
            Send(obj,cb);
        } else {
            cb('not authenticated',null);
        }
    }

    const Logout = (cb:SocketFn) => {
        let obj = GetLogoutPackage(packageID);
        Send(obj,cb);
    }

    const Send = (obj:SocketPackage,cb:SocketFn) => {
        calls[packageID] = cb;
        ws.send(JSON.stringify(obj));
        packageID++;
    }
    
    const On = (name:string,cb:SocketFn) => {
        if(!listeners[name]) listeners[name] = [];
        listeners[name].push(cb);
    }

    const ReTryConnect = (newAuthData:SocketPackageData,newUrl:string = null ,newOnLogin:SocketFn = null ) => {
        mainAuthData = newAuthData;
        authFail = false;
        if(newUrl != null) url = newUrl;
        if(newOnLogin != null) onLoginFn = newOnLogin;
        Connect(1)
    }

    const StartConnection =  ReTryConnect
    return { MakeRequest,JoinGroup,LeaveGroup,LeaveAllGroups,On,Logout,ReTryConnect,StartConnection }
}

const  GetAuthPackage = (mainAuthData:SocketPackageData ,packageID:number):SocketPackage => {
    let info: SocketPackageInfo = {
        action   : 'auth',
        request  : 'login',
        group    : null,
        packageID: packageID
    }
    let obj:SocketPackage = {
        data:mainAuthData,
        info:info
    }
    return obj;
}

const GetLeaveAllGroupsPackage = (packageID:number):SocketPackage => {
    let info: SocketPackageInfo = {
        action   : 'group',
        request  : 'leaveAll',
        group    : null,
        packageID: packageID
    }
    let obj:SocketPackage = {
        data:null,
        info:info
    }
    return obj;
}

const GetLeaveGroupPackage = (group:string,packageID:number):SocketPackage => {
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
    return obj;
} 

const GetJoinGroupPackage = (group:string,packageID:number):SocketPackage => {
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
    return obj;
}

const GetLogoutPackage = (packageID:number):SocketPackage => {
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
    return obj;
}

const GetMakeRequestPackage = (request:string | number,data:SocketPackageData,packageID:number):SocketPackage => {
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
    return obj;
}

 
