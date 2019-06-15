const Koa = require('koa');
const Router = require('koa-router');
const websocket = require('koa-easy-ws');

const app = new Koa();

const router = new Router();
const channels = {};

const handleConnection = (ws, uid) => {
    if(!channels[uid]) channels[uid] = new Set();
    console.log(`Connect client (uid: ${uid})`);
    channels[uid].add(ws);
    ws.on('close', () => {
        channels[uid].delete(ws);
        console.log(`Disconnect client (uid: ${uid})`);
        if(channels[uid].length === 0){
            console.log(`Clean up channel (uid: ${uid})`);
            delete channels[uid];
        }
    });
};

const handleCallback = (req, uid) => {
    const clients = channels[uid] || [];
    console.log(`Found ${clients.length} clients for uid: ${uid}`);
    clients.forEach(ws => {
        ws.send(JSON.stringify({
            headers: req.headers,
            query: req.params || {},
            body: req.body || {}
        }))
    });
    return clients.length;
};

router.get('/', async (ctx, next) => {
    if (ctx.ws) {
        const ws = await ctx.ws();
        handleConnection(ws, ctx.query.uid || Math.random().toString())
    }
    return next();
});

router.post('/:uid', async (ctx, next) => {
    const uid = ctx.params.uid ||ctx.query.uid;
    const count = handleCallback(ctx.req,uid);
    ctx.body = {
        clientCount: count
    };
    return next();
});

app
    .use(websocket())
    .use(router.routes())
    .use(router.allowedMethods());

module.exports = app;
