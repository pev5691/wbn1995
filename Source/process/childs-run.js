/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

var ArrChildProcess = [];

var WebProcess = {Name:"WEB PROCESS", idInterval:0, idInterval1:0, idInterval2:0, LastAlive:Date.now(), Worker:undefined, Path:"./process/web-process.js",
    OnMessage:OnMessageWeb, PeriodAlive:10 * 1000, UpdateConst:0};
global.WEB_PROCESS = WebProcess;

if(global.HTTP_HOSTING_PORT && !global.NWMODE)
{
    ArrChildProcess.push(WebProcess);
    
    WebProcess.idInterval1 = setInterval(function ()
    {
        if(WebProcess.Worker && WebProcess.Worker.connected)
        {
            try
            {
                WebProcess.Worker.send({cmd:"Stat", Name:"MAX:ALL_NODES", Value:global.CountAllNode});
                if(global.WEB_PROCESS.UpdateConst)
                {
                    global.WEB_PROCESS.UpdateConst = 0;
                    global.WEB_PROCESS.Worker.send({cmd:"UpdateConst"});
                }
            }
            catch(e)
            {
                WebProcess.Worker = undefined;
            }
        }
    }, 500);
    
    WebProcess.idInterval2 = setInterval(function ()
    {
        if(WebProcess.Worker && WebProcess.Worker.connected)
        {
            var arr = SERVER.GetDirectNodesArray(true, true).slice(1, 500);
            var arr2 = [];
            var CurTime = GetCurrentTime() - 0;
            for(var i = 0; i < SERVER.NodesArr.length; i++)
            {
                var Item = SERVER.NodesArr[i];
                if(Item.LastTime && (CurTime - Item.LastTime) < NODES_DELTA_CALC_HOUR * 3600 * 1000)
                    arr2.push({ip:Item.ip, port:Item.port, webport:Item.webport});
                else
                    if(Item.LastTimeGetNode && (CurTime - Item.LastTimeGetNode) < NODES_DELTA_CALC_HOUR * 3600 * 1000)
                        arr2.push({ip:Item.ip, port:Item.port, webport:Item.webport});
            }
            WebProcess.Worker.send({cmd:"NodeList", Value:arr, ValueAll:arr2});
        }
    }, 5000);
}

function OnMessageWeb(msg)
{
    
    switch(msg.cmd)
    {
        case "SetSmartEvent":
            {
                
                if(global.TX_PROCESS && global.TX_PROCESS.Worker)
                {
                    global.TX_PROCESS.Worker.send(msg);
                }
                break;
            }
    }
}

function AddTransactionFromWeb(Params)
{
    
    var body = GetArrFromHex(Params.HexValue);
    
    if(global.TX_PROCESS && global.TX_PROCESS.Worker)
    {
        var StrHex = GetHexFromArr(sha3(body));
        global.TX_PROCESS.Worker.send({cmd:"FindTX", TX:StrHex, Web:1, WebID:Params.WebID});
    }
    
    var Res = SERVER.AddTransaction({body:body}, 1);
    var text = AddTrMap[Res];
    var final = false;
    if(Res <= 0 && Res !==  - 3)
        final = true;
    ToLogClient("Send: " + text, GetHexFromArr(sha3(body)), final);
    
    return Res;
}



global.STATIC_PROCESS = {Name:"STATIC PROCESS", NodeOnly:1, idInterval:0, idInterval1:0, idInterval2:0, LastAlive:Date.now(),
    Worker:undefined, Path:"./process/static-process.js", OnMessage:OnMessageStatic, PeriodAlive:50000};
if(!global.TEST_JINN)
    ArrChildProcess.push(STATIC_PROCESS);

function OnMessageStatic(msg)
{
    switch(msg.cmd)
    {
        case "Send":
            {
                var Node = SERVER.NodesMap[msg.addrStr];
                if(Node)
                {
                    msg.Data = msg.Data.data;
                    SERVER.Send(Node, msg, 1);
                }
                
                break;
            }
    }
}


var TxModuleName = "./process/tx-process.js";

global.TX_PROCESS = {Name:"TX PROCESS", NodeOnly:1, idInterval:0, idInterval1:0, idInterval2:0, LastAlive:Date.now(), Worker:undefined,
    Path:TxModuleName, OnMessage:OnMessageTX, PeriodAlive:100 * 1000};
ArrChildProcess.push(TX_PROCESS);

function OnMessageTX(msg)
{
    switch(msg.cmd)
    {
        case "DappEvent":
            {
                if(WebProcess && WebProcess.Worker)
                {
                    WebProcess.Worker.send(msg);
                }
                
                AddDappEventToGlobalMap(msg.Data);
                break;
            }
    }
}

function StartAllProcess(bClose)
{
    for(var i = 0; i < ArrChildProcess.length; i++)
    {
        var Item = ArrChildProcess[i];
        StartChildProcess(Item);
    }
    if(bClose)
        setInterval(function ()
        {
            if(global.DApps && DApps.Accounts)
            {
                DApps.Accounts.Close();
                DApps.Smart.DBSmart.Close();
            }
            if(WALLET && WALLET.DBHistory)
                WALLET.DBHistory.Close();
        }, 500);
}

var GlobalRunID = 0;
var GlobalRunMap = {};

function StartChildProcess(Item)
{
    if(Item.NodeOnly && global.NET_WORK_MODE && NET_WORK_MODE.NOT_RUN)
    {
        return;
    }
    
    let ITEM = Item;
    ITEM.idInterval = setInterval(function ()
    {
        var Delta0 = Date.now() - ITEM.LastAlive;
        if(Delta0 >= 0)
        {
            var Delta = Date.now() - ITEM.LastAlive;
            if(ITEM.Worker && Delta > ITEM.PeriodAlive)
            {
                if(ITEM.Worker)
                {
                    ToLog("KILL with alive=" + (Delta / 1000) + " " + ITEM.Name + ": " + ITEM.Worker.pid);
                    try
                    {
                        process.kill(ITEM.Worker.pid, 'SIGKILL');
                    }
                    catch(e)
                    {
                        ToLog("ERR KILL");
                    }
                    ITEM.Worker = undefined;
                }
            }
            if(!ITEM.Worker)
            {
                ITEM.LastAlive = (Date.now()) + ITEM.PeriodAlive * 3;
                ToLog("STARTING " + ITEM.Name);
                ITEM.Worker = RunFork(ITEM.Path, ["READONLYDB"]);
                ITEM.pid = ITEM.Worker.pid;
                ToLog("STARTED " + ITEM.Name + ":" + ITEM.pid);
                ITEM.Worker.on('message', function (msg)
                {
                    if(ITEM.LastAlive < Date.now())
                        ITEM.LastAlive = Date.now();
                    
                    switch(msg.cmd)
                    {
                        case "call":
                            var Err = 0;
                            var Ret;
                            try
                            {
                                if(typeof msg.Params === "object" && msg.Params.F)
                                {
                                    global[msg.Name](msg.Params, function (Err,Ret)
                                    {
                                        if(msg.id && ITEM.Worker)
                                            ITEM.Worker.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
                                    });
                                    break;
                                }
                                else
                                {
                                    Ret = global[msg.Name](msg.Params);
                                }
                            }
                            catch(e)
                            {
                                Err = 1;
                                Ret = "" + e;
                            }
                            
                            if(msg.id && ITEM.Worker)
                                ITEM.Worker.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
                            break;
                            
                        case "retcall":
                            var F = GlobalRunMap[msg.id];
                            if(F)
                            {
                                delete GlobalRunMap[msg.id];
                                F(msg.Err, msg.Params);
                            }
                            break;
                        case "log":
                            ToLog(msg.message);
                            break;
                        case "ToLogClient":
                            if(WebProcess && WebProcess.Worker)
                            {
                                
                                WebProcess.Worker.send(msg);
                            }
                            
                            ToLogClient(msg.Str, msg.StrKey, msg.bFinal);
                            break;
                        case "RetFindTX":
                            if(WebProcess && WebProcess.Worker)
                            {
                                WebProcess.Worker.send(msg);
                                if(msg.Web)
                                    break;
                            }
                            
                            ToLogClient(msg.ResultStr, msg.TX, msg.bFinal);
                            break;
                        case "online":
                            if(ITEM.Worker)
                                ToLog("RUNNING " + ITEM.Name + " : " + msg.message + " pid: " + ITEM.Worker.pid);
                            break;
                        case "WriteBodyResult":
                            var Block = SERVER.ReadBlockDB(msg.BlockNum);
                            if(Block)
                            {
                                Block.arrContentResult = msg.arrContentResult;
                                SERVER.WriteBodyResultDB(Block);
                            }
                            break;
                        default:
                            if(ITEM.OnMessage)
                            {
                                ITEM.OnMessage(msg);
                            }
                            break;
                    }
                });
                
                ITEM.Worker.on('error', function (err)
                {
                });
                ITEM.Worker.on('close', function (code)
                {
                    ToLog("CLOSE " + ITEM.Name, 2);
                });
            }
        }
        
        if(ITEM.Worker)
        {
            ITEM.Worker.send({cmd:"Alive", DELTA_CURRENT_TIME:DELTA_CURRENT_TIME});
        }
    }, 500);
    ITEM.RunRPC = function (Name,Params,F)
    {
        if(!ITEM.Worker)
            return;
        
        if(F)
        {
            GlobalRunID++;
            
            try
            {
                ITEM.Worker.send({cmd:"call", id:GlobalRunID, Name:Name, Params:Params});
                GlobalRunMap[GlobalRunID] = F;
            }
            catch(e)
            {
            }
        }
        else
        {
            ITEM.Worker.send({cmd:"call", id:0, Name:Name, Params:Params});
        }
    };
}

function StopChildProcess()
{
    for(var i = 0; i < ArrChildProcess.length; i++)
    {
        var Item = ArrChildProcess[i];
        if(Item.idInterval)
            clearInterval(Item.idInterval);
        Item.idInterval = 0;
        if(Item.idInterval1)
            clearInterval(Item.idInterval1);
        Item.idInterval1 = 0;
        if(Item.idInterval2)
            clearInterval(Item.idInterval2);
        Item.idInterval2 = 0;
        
        if(Item.Worker && Item.Worker.connected)
        {
            Item.Worker.send({cmd:"Exit"});
            Item.Worker = undefined;
        }
    }
    
    RunStopPOWProcess("STOP");
}

global.StartAllProcess = StartAllProcess;
global.StopChildProcess = StopChildProcess;
global.AddTransactionFromWeb = AddTransactionFromWeb;
