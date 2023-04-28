import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/');
let count = 0;
let stackFn = [];
let stackListeners = [];

console.log('connecting to localhost:3000');
ws.on('open', function open() {
    console.log('connected');
    Send('auth',{user:'admin', password:'admin'},function(error, resp){
        console.log({error, resp});

        Send('imIn',{group:'company'},function(err,res){
            console.log({err,res});
            Send('getUsers',{},function(err,res){
                console.log(JSON.stringify({err,res},null,4));
                Listen('tester',function(error, resp){
                    console.log({error, resp});
                    Send('imOut',{group:'company'},function(err,res){
                        console.log({err,res});
                        
                    });

                });
            });

        });
    });
   
});

ws.on('message', function incoming(incomingData) {
    try {
        let  obj = JSON.parse(incomingData);
        let { id, type, error,data } = obj;
        if(type == "broadcast"){
            for(let i = 0; i < stackListeners.length; i++){
                let {id} = stackListeners[i];
                if(id == id){
                    let fn = stackListeners[i].fn;
                    fn(error,data);
                }
            }
        } else {
            let foundIndex = -1;
            for (let i = 0; i < stackFn.length; i++) {
                if (id === stackFn[i].id) {
                    foundIndex = i;
                }
            }
            if (foundIndex !== -1) {
                let fn = stackFn[foundIndex].fn;
                stackFn.splice(foundIndex, 1);
                fn(error, data);
            } else {
                console.log({error, data, no: 'not found'});
            }
        }
    } catch (e) {
        // console.log(e);
    }
});


ws.on('error', function error(err) {
    console.log(err);
});

ws.on('close', function close() {
    
    console.log('disconnected');
});


function Send(iType,iData,cb){
    let obj = {
        type: iType,
        data:iData,
        id: count
    }
    stackFn.push({
        id: count,
        fn: cb
    });
    ws.send(JSON.stringify(obj));
    count++;
    
}


function Listen(iType,cb){
    stackListeners.push({
        id: iType,
        fn: cb
    });
}


