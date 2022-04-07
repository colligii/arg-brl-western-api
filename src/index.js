const express = require("express");
const app = express();
const server = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
const cors = require("cors");
const priceARG = require("./lib/priceARG");
const historyPrices = require("./lib/historyPrices");

const lastPrices = [...historyPrices];

let lastPingDate,
lastDate;

let canRequest = true;

app.use(cors());

function sendInfo({ x, y }) {
    io.emit("brl-arg/western", { x, y })
}

app.use(express.static(__dirname+"/dist"));

app.get("/", (req,res) => res.send("teste"));

app.get("/getValues", (req, res) => {
    res.json(lastPrices);
})

app.get("*",(req, res) => {
    res.sendFile(__dirname+"/dist/index.html")
})

function registerInfo({ x, y }) {
    lastPrices.push({ x, y });
}

async function registerMoney() {
    lastPingDate = new Date().getTime();
    lastDate = new Date().getTime();
    let x = new Date(),
    y = [0, 0, 0, 0];
    while(lastPingDate-lastDate <= 60000) {
        if(new Date().getTime()-lastPingDate >= 16000) {
            lastPingDate = new Date().getTime()
            let resultFxRate = canRequest ? await priceARG() : "";
            if(resultFxRate != false && canRequest) {
                resultFxRate = resultFxRate.services_groups[0].pay_groups[0].fx_rate;
                if(y[0] == 0) y[0] = resultFxRate;
                if(y[1] < resultFxRate) y[1] = resultFxRate;
                if(y[2] > resultFxRate || y[2] == 0) y[2] = resultFxRate;
                y[3] = resultFxRate;
                console.log(resultFxRate);
            } else if(resultFxRate === "" && canRequest) {
                canRequest = false;
                setTimeout(() => {
                    canRequest = true;
                },1700)
            }lastDate
        }
        
    }
    if(lastPingDate-lastDate >= 60000) {
        console.log("teste");

        registerInfo({x, y});
        sendInfo({x, y});
        registerMoney();
    }
}

io.on("connection", (socket) => {
    socket.emit("init-app", lastPrices);
})



server.listen(5000, () => {
    console.log(`server is running at port ${5000}`)
    registerMoney() 
})
