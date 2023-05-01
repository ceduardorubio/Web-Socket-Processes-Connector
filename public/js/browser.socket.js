export const CreateBrowserClientSocket = (url,authData,onLogin,onError = console.log) => {
    let webSocket = new WebSocket(url);;
    let packageID = 0;
    let session   = null;
    let calls     = {};
    let listeners = {};

    const ReConnect = () => {
        setTimeout(() => {
            console.log('reconnecting...');
            try {
                webSocket.onclose = () => {};
                webSocket.onerror = () => {};
                webSocket.onopen  = () => {};
                webSocket.onmessage = () => {};
                webSocket.close();
                webSocket = new WebSocket(url);
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

    const AuthLoginServer = (cb) => {
        let info = {
            action   : 'auth',
            request  : 'login',
            group    : null,
            packageID: packageID
        }
        let obj = {
            data:authData,
            info:info
        }
        calls[packageID] = cb;
        webSocket.send(JSON.stringify(obj));
        packageID++;
    }
    const AppendListeners = () =>{
        webSocket.onerror =  e => {
            onError(e);
            setTimeout(() => { ReConnect(); }, 2_000);
            webSocket.close();
        };
        webSocket.onclose = e => {
            console.log('error...');
            onError(e);
            setTimeout(() => { ReConnect(); }, 2_000);
            webSocket.close();
        };
        webSocket.onopen =  () => { 
            console.log("open");
            AuthLoginServer((error,sessionData) => { 
                if(error){
                    session = null;
                    onLogin(error,null);

                } else {
                    session = sessionData;
                    onLogin(null,sessionData);
                }
            });
        };
        webSocket.onmessage = function incoming(xMsg) {
            let incomingData = xMsg.data;
            try {
                let r = JSON.parse(incomingData);
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
                onError( 'invalid data: ');
            }
        };
    }
    AppendListeners();
    const MakeRequest = (request,data,cb) => {
        if(session){
            let info = {
                action   : 'call',
                request  : request,
                group    : null,
                packageID: packageID
            }
            let obj = {
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

    const JoinGroup = (group,cb) => {
        if(session){
            let info = {
                action   : 'group',
                request  : 'join',
                group    : group,
                packageID: packageID
            }
            let obj = {
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

    const LeaveGroup = (group,cb) => {
        if(session){
            let info = {
                action   : 'group',
                request  : 'leave',
                group    : group,
                packageID: packageID
            }
            let obj = {
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

    const LeaveAllGroups = (cb) => {
        if(session){
            let info = {
                action: 'group',
                request: 'leaveAll',
                group: null,
                packageID: packageID
            }
            let obj = {
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

    const On = (name,cb) => {
        if(!listeners[name]) listeners[name] = [];
        listeners[name].push(cb);
    }

    const Logout = (cb) => {
        let info = {
            action   : 'auth',
            request  : 'logout',
            group    : null,
            packageID: packageID
        }
        let obj = {
            data:null,
            info:info
        }
        calls[packageID] = cb;
        webSocket.send(JSON.stringify(obj));
        packageID++;
    }

    return {
        MakeRequest,
        JoinGroup,
        LeaveGroup,
        LeaveAllGroups,
        On,
        Logout
    }
}