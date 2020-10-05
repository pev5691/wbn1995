/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

'use strict';
global.PROCESS_NAME = "MAIN";

const fs = require('fs');
const os = require('os');
require("../core/constant");
const crypto = require('crypto');

global.START_SERVER = 1;
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);

console.log("DATA DIR: " + global.DATA_PATH);
console.log("PROGRAM DIR: " + global.CODE_PATH);

require("../core/library");

ToLog(os.platform() + " (" + os.arch() + ") " + os.release());

var VerArr = process.versions.node.split('.');

ToLog("nodejs: " + process.versions.node);

if(VerArr[0] < 8)
{
    ToError("Error version of NodeJS=" + VerArr[0] + "  Pls, download new version from www.nodejs.org and update it. The minimum version must be 8");
    process.exit();
}

var CServer = require("../core/server");

require("../core/tests");


global.DEF_PERIOD_SIGN_LIB = 100;
setTimeout(function ()
{
    TestSignLib(DEF_PERIOD_SIGN_LIB);
}
, 4000);



global.glCurNumFindArr = 0;
global.ArrReconnect = [];
global.ArrConnect = [];

var FindList = [
    {"ip":"194.147.78.188", "port":34734}, {"ip":"w1.wellbeing.su", "port":34734},
    {"ip":"194.147.78.188", "port":3774}, {"ip":"w2.wellbeing.su", "port":3774},
    {"ip":"194.147.78.188", "port":7347}, {"ip":"w3.wellbeing.su", "port":7347},
    {"ip":"185.125.217.70", "port":34734}, {"ip":"w4.wellbeing.su", "port":34734},
    {"ip":"185.125.217.70", "port":3774}, {"ip":"w5.wellbeing.su", "port":3774},
    {"ip":"185.125.217.70", "port":7347}, {"ip":"w6.wellbeing.su", "port":7347}
];

if(global.LOCAL_RUN)
{
    FindList = [{"ip":"127.0.0.1", "port":34374}, {"ip":"127.0.0.1", "port":3747}];
}
else
    if(global.TEST_NETWORK)
    {
        FindList = [{"ip":"dappsgate.com", "port":40000}, {"ip":"212.80.217.199", "port":40000}, ];
    }

if(global.FORK_MODE)
{
    if(global.FORK_IP_LIST)
        FindList = global.FORK_IP_LIST;
    else
        FindList = [];
}

global.SERVER = undefined;
global.NeedRestart = 0;

process.on('uncaughtException', function (err)
{
    if(global.PROCESS_NAME !== "MAIN")
    {
        process.send({cmd:"log", message:err});
    }
    
    if(err.code === "ENOTFOUND" || err.code === "ECONNRESET" || err.code === "EPIPE" || err.code === "ETIMEDOUT")
    {
    }
    else
    {
        ToError(err.stack);
        ToLog(err.stack);
        
        TO_ERROR_LOG("APP", 666, err);
        ToLog("-----------------EXIT------------------");
        process.exit();
    }
}
);
process.on('error', function (err)
{
    ToError(err.stack);
    ToLog(err.stack);
}
);

require("./childs-run");



require("../core/mining");

require("../core/html-server");
RunServer();

setInterval(function run1()
{
    DoConnectToNodes(ArrReconnect, "RECONNECT");
}
, 200);

setInterval(function run2()
{
    DoGetNodes();
    
    DoConnectToNodes(ArrConnect, "CONNECT");
}
, 500);

if(global.ADDRLIST_MODE)
{
    return;
}


function DoGetNodes()
{
    if(!SERVER)
        return;
    if(!GrayConnect() && SERVER.CanSend < 2)
        return;
    
    if(!SERVER.NodesArrUnSort || !SERVER.NodesArrUnSort.length)
        return;
    
    var Num = glCurNumFindArr % SERVER.NodesArrUnSort.length;
    var Node = SERVER.NodesArrUnSort[Num];
    if(Num === 0)
        glCurNumFindArr = 0;
    glCurNumFindArr++;
    
    if(Node.Delete)
        return;
    
    if(SERVER.NodeInBan(Node))
        return;
    
    if(SERVER.BusyLevel && Node.BlockProcessCount <= SERVER.BusyLevel)
        return;
    
    if(GetSocketStatus(Node.Socket) === 100)
    {
        
        SERVER.StartGetNodes(Node);
    }
}

function DoConnectToNodes(Arr,Mode)
{
    if(!SERVER || global.TEST_JINN)
        return;
    if(!GrayConnect() && SERVER.CanSend < 2)
    {
        return;
    }
    
    if(GrayConnect() && SERVER.ActualNodes.size > GetGrayServerConnections())
        return;
    
    if(Arr.length)
    {
        var MinProcessCount = SERVER.BusyLevel - 1;
        for(var i = 0; i < Arr.length; i++)
        {
            var Node = Arr[i];
            if(Node.BlockProcessCount > MinProcessCount)
            {
                Arr.splice(i, 1);
                
                if(Mode === "CONNECT")
                {
                    Node.WasAddToConnect = undefined;
                    SERVER.StartConnectTry(Node);
                }
                else
                    if(Mode === "RECONNECT")
                    {
                        Node.WasAddToReconnect = undefined;
                        Node.CreateConnect();
                    }
                break;
            }
        }
    }
}

var idRunOnce;
function RunServer()
{
    idRunOnce = setInterval(RunOnce, 1000);
    ToLog("NETWORK: " + GetNetworkName());
    ToLog("VERSION: " + DEF_VERSION);
    
    if(global.NET_WORK_MODE)
    {
        if(!NET_WORK_MODE.ip)
            NET_WORK_MODE.ip = "";
        global.START_IP = NET_WORK_MODE.ip;
        global.START_PORT_NUMBER = NET_WORK_MODE.port;
    }
    
    var KeyPair = crypto.createECDH('secp256k1');
    if(!global.SERVER_PRIVATE_KEY_HEX)
    {
        while(true)
        {
            var Arr = crypto.randomBytes(32);
            KeyPair.setPrivateKey(Buffer.from(Arr));
            var Arr2 = KeyPair.getPublicKey('', 'compressed');
            if(Arr2[0] === 2)
                break;
        }
        
        global.SERVER_PRIVATE_KEY_HEX = GetHexFromArr(Arr);
        SAVE_CONST(true);
    }
    
    var ServerPrivKey = GetArrFromHex(global.SERVER_PRIVATE_KEY_HEX);
    if(global.USE_NET_FOR_SERVER_ADDRES)
    {
        const os = require('os');
        var map = os.networkInterfaces();
        main:
        for(var key in map)
        {
            var arr = map[key];
            for(var i = 0; i < arr.length; i++)
            {
                var item = arr[i];
                if(!item.internal && item.mac !== "00:00:00:00:00:00")
                {
                    ServerPrivKey = sha3(global.SERVER_PRIVATE_KEY_HEX + ":" + item.mac + ":" + global.START_PORT_NUMBER);
                    break main;
                }
            }
        }
    }
    
    KeyPair.setPrivateKey(Buffer.from(ServerPrivKey));
    
    if(global.TEST_JINN)
    {
        START_IP = global.JINN_IP;
        START_PORT_NUMBER = global.JINN_PORT;
    }
    
    var Worker = new CServer(KeyPair, START_IP, START_PORT_NUMBER, false, global.TEST_JINN);
    
    if(global.TEST_JINN)
    {
        StartJinn();
        return;
    }
    
    DoStartFindList();
}

function StartJinn()
{
    var JinnLib = require("../jinn/tera");
    if(!global.JINN_IP)
        global.JINN_IP = "0.0.0.0";
    
    global.NET_WORK_MODE = undefined;
    StartPortMapping(global.JINN_IP, global.JINN_PORT, function (ip)
    {
        
        JinnLib.Create(SERVER);
        SERVER.CanSend = 2;
        setTimeout(function ()
        {
            SERVER.CheckStartedBlocks();
        }, 800);
    });
}

function DoStartFindList()
{
    var keyThisServer = SERVER.ip + ":" + SERVER.port;
    
    for(var n = 0; n < FindList.length; n++)
    {
        var item = FindList[n];
        if(!item.ip)
            continue;
        
        var key = item.ip + ":" + item.port;
        if(keyThisServer === key)
            continue;
        var Node = SERVER.GetNewNode(item.ip, item.port);
        if(Node)
            Node.StartFindList = 1;
    }
}

function RunOnce()
{
    if(global.SERVER && global.SERVER.CheckOnStartComplete)
    {
        clearInterval(idRunOnce);
        
        require("../core/update");
        RunOnUpdate();
        
        setTimeout(function ()
        {
            StartAllProcess(1);
        }, 1000);
        
        require("./dogs");
        
        if(global.RESTART_PERIOD_SEC)
        {
            var Period = (random(600) + global.RESTART_PERIOD_SEC);
            ToLog("SET RESTART NODE AFTER: " + Period + " sec");
            setInterval(function ()
            {
                RestartNode();
            }, Period * 1000);
        }
        
        setTimeout(function ()
        {
            RunStopPOWProcess();
        }, 10000);
    }
}

var glPortDebug = 49800;
function RunFork(Path,ArrArgs)
{
    
    const child_process = require('child_process');
    ArrArgs = ArrArgs || [];
    
    if(global.LOCAL_RUN)
    {
        ArrArgs.push("LOCALRUN");
        ArrArgs.push("STARTNETWORK:" + global.START_NETWORK_DATE);
    }
    else
        if(global.TEST_NETWORK)
            ArrArgs.push("TESTRUN");
    
    if(global.JINN_MODE)
        ArrArgs.push("JINNMODE");
    
    ArrArgs.push("PATH:" + global.DATA_PATH);
    ArrArgs.push("HOSTING:" + global.HTTP_HOSTING_PORT);
    if(!global.USE_PARAM_JS)
        ArrArgs.push("NOPARAMJS");
    
    if(global.NWMODE)
        ArrArgs.push("NWMODE");
    if(global.NOALIVE)
        ArrArgs.push("NOALIVE");
    if(global.DEV_MODE)
        ArrArgs.push("DEV_MODE");
    if(global.NOHTMLPASSWORD)
        ArrArgs.push("NOPSWD");
    glPortDebug++;
    var execArgv = [];
    
    var Worker = child_process.fork(Path, ArrArgs, {execArgv:execArgv});
    return Worker;
}

global.RunFork = RunFork;
