
import http from 'http';
import express from 'express';
import { CreateServerSocket } from '../server.socket';
const app     = express();

app.use(express.static('public'));
app.get('/', (req, res) => res.redirect('/index.html'));

const users = {
    users: [
        {
            name: 'user1',
            id: 1,
        },
        {
            name: 'user2',
            id: 2,
        },
    ],
}

const server = http.createServer(app);
const serverSocket = CreateServerSocket(server,(incomingData, setSession,closeSocketInternal,response )=> {
    console.log("authenticating");
    console.log({incomingData});
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
}, 1000);

setInterval(() => {
    serverSocket.Broadcast('to everyone',null,{
        message: 'this is a message that all groups will receive',
    });
}, 1700);
