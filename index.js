import { attachToServer, stackSocketListener, setSocketBroadCast, SetAuth } from './socket.js';
import http from 'http';
import express from 'express';
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

attachToServer(server);

server.listen(3000, () => console.log('Listening on http://localhost:3000'));

stackSocketListener('getUsers', (incomingData, resp, session) => resp(users));

SetAuth((incomingData, cb )=> {
    let { user, password } = incomingData;
    if (user === 'admin' && password === 'admin') {
        cb(null, { user});
    } else {
        cb('error');
    };
});

setInterval(() => {
    setSocketBroadCast('tester', "company" ,{
        message: 'you are in company',
    });
}, 8000);

setInterval(() => {
    setSocketBroadCast('tester',null,{
        message: 'you are not in any company',
    });
}, 12000);
