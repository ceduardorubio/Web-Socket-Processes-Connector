import http from 'http';
import express from 'express';
import { CreateServerSocket } from '../server.socket';
import { CreateClientSocket } from '../client.socket';
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
    console.log({cmd:'Connect',err,res});
    //client.MakeRequest('getUsers',{},(err,res) => { console.log({cmd:'getUsers',err,res});});

    client.JoinGroup('company',(err,res) => { console.log({cmd: 'Join company',err,res});});
    client.On("company's broadcast",(err,res) => {
        serverSocket.Broadcast("company's broadcast", "company" ,res);
    });
    client.On('to everyone',(err,res) => { 
        serverSocket.Broadcast('to everyone',null,res);
    });

    // setTimeout(() => client.LeaveGroup('company',(err,res) => { console.log({cmd:'Leave company',err,res});}), 10_000);
    // setTimeout(() => client.Logout((err,res) => { console.log({cmd:'Logout',err,res});}), 16_000);
})











