# Web Socket Processes Connector
## Description
This is a simple web socket connector that can be used to connect to a web socket server and send and receive messages. 
 - No redis required
 - No database required
 - No Socket.io required
 - Auto reconnection 
 - Use it on the browser or on the server
 - Use it with Typescript or Javascript
 - Use it with React, Angular, Vue, Node, Express, etc.

## Requirements
 - ws ( npm install ws inside package.json)
 - server requires http server (http , express)

## IMPORTANT 
 - The browser library code is available in the FRONTEND EXAMPLES part of this readme .
 - The browser library (browser.socket.js) is available in the public folder on the github repository.
 - The browser library in TS will be available soon.
## Features
- For client 


    ```typescript
        CreateClientSocket(url:string,authData:SocketPackageData,onLogin:SocketFn,onError:(data:any) => void = console.error) // connects to server and execute onLogin when server accepts connection with authData 
        // execute the next procedures after onLogin. Example:
        const client = CreateClientSocket(url,authData,(err,res) => { 
            client.MakeRequest('getUsers',{},(err,res) => { console.log({cmd:'getUsers',err,res});});
        });


        // client after login methods
        client.MakeRequest (request:string | number,data:SocketPackageData,cb:SocketFn);//  make request to server, send data and execute callback when server responds
        client.JoinGroup(group:string,cb:SocketFn);                                     // join group with name
        client.LeaveGroup(group:string,cb:SocketFn);                                    //  leave group with name
        client.LeaveAllGroups(cb:SocketFn);                                             // leave all groups
        client.On(name:string,cb:SocketFn);                                             // execute callback when server sends a message with name
        client.Logout(cb:SocketFn);                                                     // logout from server

    ```

- For server


    ```typescript
        const socketServer = CreateServerSocket(server:Server,authClientLogin:AuthLoginFn,authClientLogout:AuthLogoutFn = null,timeAlive:number = 30_000,onSocketError:(e:any) => void = console.error) // create server socket and execute authClientLogin when client connects and authClientLogout when client asks to logout. timeAlive is the time in milliseconds that the server will wait for a client to send a message before closing the connection and ping pong messages are sent to keep the connection alive.
        socketServer.On(type:string,cb:MiddlewareFn), // execute callback when client sends a message with type
        socketServer.Close()                        // close server
        socketServer.Broadcast(name:string,group:string | null,data:SocketPackageData,emitter:WebSocket = null) // broadcast message to all clients or to a group of clients inside a group
    ```

## Usage

### Installation
```npm install web-socket-processes-connector```

### Importing socketServer
```typescript

    import http from 'http';
    import express from 'express';
    import { CreateServerSocket } from 'web-socket-processes-connector';
    const app     = express();

    app.use(express.static('public')); // public folder with browser websocket connector example
    app.get('/', (req, res) => res.redirect('/index.html'));

    const users = {users: [ {name: 'user1',id: 1,},{name: 'user2',id: 2,},],}

    const server = http.createServer(app);
    const serverSocket = CreateServerSocket(server,(incomingData, setSession,closeSocketInternal,response )=> {
        let { user, password } = incomingData;
        if (user === 'admin' && password === 'admin') {
            setSession({ user });
            response(null, { user});
        } else {
            response('invalid credential', null);
            closeSocketInternal();
        };
    });

    server.listen(3000, () => console.log('Listening on http://localhost:3000'));

    serverSocket.On('getUsers', (incomingData, resp,sessionData,groups) => resp(null,users));

    setInterval(() => {
        serverSocket.Broadcast("company's broadcast", "company" ,{
            message: 'this is a message that only company group will receive',
        });
    }, 3000);

    setInterval(() => {
        serverSocket.Broadcast('to everyone',null,{
            message: 'this is a message that all groups will receive',
        });
    }, 4000);

```

### Importing Client
```typescript
    import http from 'http';
    import express from 'express';
    import { CreateServerSocket, CreateClientSocket} from 'web-socket-processes-connector';
    const app = express();

    app.use(express.static('public'));
    app.get('/', (req, res) => res.redirect('/index.html'));

    const users = {users: [ {name: 'user1',id: 1,},{name: 'user2',id: 2,},],}


    const server = http.createServer(app);
    const serverSocket = CreateServerSocket(server,(incomingData, setSession,closeSocketInternal,response )=> {
        let { user, password } = incomingData;
        if (user === 'admin' && password === 'admin') {
            setSession({ user });
            response(null, { user});
        } else {
            response('invalid credential', null);
            closeSocketInternal();
        };
    });

    server.listen(4000, () => console.log('Listening on http://localhost:4000'));

    serverSocket.On('getUsers', (incomingData, resp,sessionData,groups) => resp(null,users));

    const wsURL  = "ws://localhost:3000/";
    const auth   = {user : 'admin', password:'admin'};
    const client = CreateClientSocket();
    client.StartConnection(auth,wsURL,(err,res) => { 

        client.JoinGroup('company',(err,res) => { 
            console.log({cmd: 'Join company',err,res});
        });

        client.On("company's broadcast",(err,res) => {
            serverSocket.Broadcast("company's broadcast", "company" ,res);
        });
        
        client.On('to everyone',(err,res) => { 
            serverSocket.Broadcast('to everyone',null,res);
        });

    });

    // in case of wrong credentials you can try again with the same client using the same client.StartConnection(auth,wsURL,(err,res) => { ... }); method.

```

In the previous example the client connects to the main server and then joins the group "company". The server is broadcasting to the group "company" every 3 seconds and to all groups every 4 seconds. The client is listening to the server and broadcasting to the server every time it receives a message from the server.

The client is also a server and can receive connections from other clients (in this example browser clients). The client can also broadcast to all groups or to a specific group.

You can create your rules for your client processes like 
```typescript
    client.JoinGroup('company',(err,res) => { 
        console.log({cmd: 'Join company',err,res});
    });

    client.On("company's broadcast",(err,res) => {
        serverSocket.Broadcast("company's broadcast", "company" ,res);
    });
    
    client.On('to everyone',(err,res) => { 
        serverSocket.Broadcast('to everyone',null,res);
    });
```

You can create you routes for your server process like this:

```typescript
    serverSocket.On('getUsers', (incomingData, resp,sessionData,groups) => resp(null,users));
```



You can see a working example in the folder [example](example) on github. Just execute server.example.ts in one terminal and client.example.ts in another terminal. Then open the browser in http://localhost:4000 and you will see the client example running in the browser.


## FRONTEND EXAMPLES (Browser)
- index.html
```html 
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Socket</title>
    </head>
    <body>
        <h1>
            Testing...
        </h1>

        <script type="module">
            import {CreateBrowserClientSocket} from './js/browser.socket.js';
            const wsURL  = "ws://localhost:4000/";
            const auth   = {user : 'admin', password:'admin'};
            const client = CreateBrowserClientSocket(wsURL,auth,(err,res) => { 
                console.log({cmd:'Connect',err,res});

                client.JoinGroup('company',(err,res) => { console.log({cmd: 'Join company',err,res});});
                client.On("company's broadcast",(err,res) => { console.log({cmd:"company's broadcast",err,res});});
                client.MakeRequest('getUsers',{},(err,res) => { console.log({cmd:'getUsers',err,res});});
                client.On('to everyone',(err,res) => { console.log({cmd:'to everyone',err,res});});

                setTimeout(() => client.LeaveGroup('company',(err,res) => { console.log({cmd:'Leave company',err,res});}), 3_000);
                // setTimeout(() => client.Logout((err,res) => { console.log({cmd:'Logout',err,res});}), 16_000);
            });



        </script>
    </body>
    </html>
```

- browser.socket.ts
```javascript
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
```

- browser.socket.ts
```typescript
    import { SocketFn, SocketListeners, SocketPackage, SocketPackageData, SocketPackageInfo, SocketPackageResponse, SocketServerCallsStack } from "./types";

export const CreateBrowserClientSocket = (url:string,onError:(data:any) => void = console.log) => {
    let webSocket:WebSocket                   = null
    let packageID:number                      = 0;
    let session  :SocketPackageData | null    = null;
    let calls    :SocketServerCallsStack      = {};
    let listeners:SocketListeners             = {};
    let mainAuthData:SocketPackageData | null = null;
    let authFailed:boolean                    = false;
    let onLogin: SocketFn |null               = null


    const Connect = (t:number = 2_000) => {
        if(authFailed ) return;

        setTimeout(() => {
          console.log('reconnecting...');
          try {
              if(webSocket != null){
                webSocket.onclose = () => {};
                webSocket.onerror = () => {};
                webSocket.onopen  = () => {};
                webSocket.onmessage = () => {};
                webSocket.close();
              }
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
      },t);
    }


    const AuthLoginServer = (cb:SocketFn) => {
        let info: SocketPackageInfo = {
            action   : 'auth',
            request  : 'login',
            group    : '',
            packageID: packageID
        }
        let obj:SocketPackage = {
            data:mainAuthData,
            info:info
        }
        calls[packageID] = cb;
        webSocket.send(JSON.stringify(obj));
        packageID++;
    }

    const AppendListeners = () =>{
        webSocket.onerror =  e => {
            onError(e);
            setTimeout(() => { Connect(); }, 2_000);
            webSocket.close();
        };
        webSocket.onclose = e => {
            console.log('error...');
            onError(e);
            setTimeout(() => { Connect(); }, 2_000);
            webSocket.close();
        };
        webSocket.onopen =  () => {
            AuthLoginServer((error,sessionData) => {
                if(error){
                    session = null;
                    authFailed = true;
                    onLogin(error,{});

                } else {
                    session = sessionData;
                    onLogin(null,sessionData);
                }
            });
        };
        webSocket.onmessage = function incoming(xMsg) {
            let incomingData:string = xMsg.data;
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
        };
    }

    const MakeRequest = (request:string | number,data:SocketPackageData,cb:SocketFn) => {
        if(session){
            let info: SocketPackageInfo = {
                action   : 'call',
                request  : request,
                group    : '',
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
            cb('not authenticated',{});
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
                data:{},
                info:info
            }
            calls[packageID] = cb;
            webSocket.send(JSON.stringify(obj));
            packageID++;
        } else {
            cb('not authenticated',{});
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
                data:{},
                info:info
            }
            calls[packageID] = cb;
            webSocket.send(JSON.stringify(obj));
            packageID++;
        } else {
            cb('not authenticated',{});
        }
    }

    const LeaveAllGroups = (cb:SocketFn) => {
        if(session){
            let info: SocketPackageInfo = {
                action: 'group',
                request: 'leaveAll',
                group: '',
                packageID: packageID
            }
            let obj:SocketPackage = {
                data:{},
                info:info
            }
            calls[packageID] = cb;
            webSocket.send(JSON.stringify(obj));
            packageID++;
        } else {
            cb('not authenticated',{});
        }
    }

    const On = (name:string,cb:SocketFn) => {
        if(!listeners[name]) listeners[name] = [];
        listeners[name].push(cb);
    }

    const Logout = (cb:SocketFn) => {
        authFailed = true;
        let info: SocketPackageInfo = {
            action   : 'auth',
            request  : 'logout',
            group    : '',
            packageID: packageID
        }
        let obj:SocketPackage = {
            data:{},
            info:info
        }
        calls[packageID] = cb;
        webSocket.send(JSON.stringify(obj));
        packageID++;
    }

    const ConnectAndAuthenticate = (newAuthData:SocketPackageData,newOnLogin:SocketFn) => {
      authFailed = false;
      mainAuthData = newAuthData;
      onLogin = newOnLogin;
      Connect(1);
    }


    let result: SocketConnector = {
      MakeRequest,
      JoinGroup,
      LeaveGroup,
      LeaveAllGroups,
      On,
      Logout,
      ConnectAndAuthenticate
    }

    return result
}

export interface SocketConnector {

    MakeRequest(request:string | number,data:SocketPackageData,cb:SocketFn):void;
    JoinGroup(group:string,cb:SocketFn):void;
    LeaveGroup(group:string,cb:SocketFn):void;
    LeaveAllGroups(cb:SocketFn):void;
    On(name:string,cb:SocketFn):void;
    Logout(cb:SocketFn):void;
    ConnectAndAuthenticate(newAuthData:SocketPackageData,newOnLogin:SocketFn):void;
}

```

- types.ts
```typescript
export interface SocketSession {
  isAlive: boolean,
  data   : SocketPackageData,
  groups : string[],
}

export interface SocketPackage {
  info: SocketPackageInfo,
  data: SocketPackageData
}

export interface SocketPackageInfo {
  action   : 'group' | 'call' | 'auth' | 'broadcast',
  request  : string | number,
  group    : string,
  packageID: number
}

export interface SocketPackageData {
  [key: string | number]: any
}

export interface SocketPackageResponse {
  info    : SocketPackageInfo,
  error   : any,
  response: SocketPackageData
}

export interface SocketServerCallsStack {
  [key: number]: SocketFn
}

export interface SocketListeners {
  [key: string]: SocketFn[]
}

export type SocketFn     = (error: any, response: SocketPackageData) => void


export type AuthLoginFn  = (data:any,setSession:(data:SocketPackageData)=> void ,closeSocketInternal:() => void,SendToClient:SocketFn) => void
export type AuthLogoutFn = (sessionData:SocketPackageData,SendToClient:SocketFn) => void
export type MiddlewareFn = (data:SocketPackageData,response:SocketFn,sessionData:SocketPackageData,groups:string[]) => void

export interface SocketRouter {
  [key:string | number]:MiddlewareFn
}

export interface SocketServer {
  On:(type:string,cb:MiddlewareFn) => void,
  Close: () => void,
  Broadcast: (name:string,group:string | null,data:SocketPackageData,emitter?:WebSocket) => void


}
```

## Documentation
    - Work in progress

## License

[MIT](LICENSE)

## Author

Carlos Velasquez

## JUST READ THE CODE 
IT IS VERY SIMPLE

    - src/server.socket.ts:  less than 200 lines of code
    - src/client.socket.ts:  less than 200 lines of code