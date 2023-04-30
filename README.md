# Web Socket Processes Connector
## Description
This is a simple web socket connector that can be used to connect to a web socket server and send and receive messages. 
 - No redis required
 - No database required
 - No Socket.io required

## Requirements
 - ws ( npm install ws inside package.json)
 - server requires http server (http , express)

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
    const client = CreateClientSocket(wsURL,auth,(err,res) => { 
        //client.MakeRequest('getUsers',{},(err,res) => { console.log({cmd:'getUsers',err,res});});

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



## License

[MIT](LICENSE)

## Author

Carlos Velasquez

## JUST READ THE CODE 
IT IS VERY SIMPLE

    - src/server.socket.ts:  less than 200 lines of code
    - src/client.socket.ts:  less than 200 lines of code
    - src/browser.socket.ts: less than 200 lines of code