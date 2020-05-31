/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Working with network sockets, creating a network server
 *
**/

'use strict';

const net = require("net");

global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter, Name:"NetSocket"});

global.StopNetwork = 0;

//Engine context

function InitClass(Engine)
{
    
    Engine.CreateServer = function ()
    {
        Engine.Server = net.createServer(function (Socket)
        {
            if(global.StopNetwork)
                return;
            if(Engine.WasBanIP({address:Socket.remoteAddress}))
            {
                Engine.CloseSocket(Socket, undefined, "WAS BAN", true);
                return;
            }
            
            var Child = Engine.RetNewConnectByIPPort(Socket.remoteAddress, Socket.remotePort, 1);
            if(Child)
            {
                Child.InComeConnect = 1;
                Child.ToLogNet("Connect from " + Socket.remoteAddress + ":" + Socket.remotePort);
                Engine.SetEventsProcessing(Socket, Child, "Client", 1);
            }
            else
                Engine.CloseSocket(Socket, Child, "Error child");
        });
        
        Engine.Server.on('close', function ()
        {
        });
        
        Engine.Server.on('error', function (err)
        {
            if(err.code === 'EADDRINUSE')
            {
                Engine.ToLog('Port ' + Engine.port + ' in use, retrying after 5 sec...');
                if(Engine.Server)
                    Engine.Server.close();
                setTimeout(function ()
                {
                    Engine.RunListenServer();
                }, 5000);
            }
        });
        
        Engine.RunListenServer();
    };
    
    Engine.RunListenServer = function ()
    {
        if(!Engine.port || typeof Engine.port !== "number")
            throw "Error port number = " + Engine.port;
        
        var LISTEN_IP = "0.0.0.0";
        Engine.ToDebug("Prepare to run TCP server on " + LISTEN_IP + ":" + Engine.port);
        Engine.Server.listen(Engine.port, LISTEN_IP, function ()
        {
            var AddObj = Engine.Server.address();
            Engine.ToLog("Run JINN TCP server on " + AddObj.family + " " + AddObj.address + ":" + AddObj.port);
        });
    };
    
    Engine.SetEventsProcessing = function (SOCKET,Child,StrConnect,bAll)
    {
        
        SOCKET.on('close', function (err)
        {
            Engine.ClearSocket(SOCKET, Child);
        });
        
        SOCKET.on('error', function (err)
        {
            Engine.CloseSocket(SOCKET, Child, "ERRORS");
        });
        SOCKET.on('end', function ()
        {
            if(Child.LogNetBuf && Child.AddrItem)
                Engine.GetLogNetBuf(Child);
        });
        
        if(!bAll)
            return;
        Engine.LinkSocketToChild(SOCKET, Child, StrConnect);
        SOCKET.on('data', function (data)
        {
            if(global.StopNetwork)
                return;
            if(SOCKET.WasClose)
            {
                return;
            }
            else
                if(SOCKET.WasChild)
                {
                    var StatusNum = Engine.GetSocketStatus(Child);
                    if(StatusNum === 100)
                    {
                        Engine.ReceiveFromNetwork(Child, data);
                    }
                    else
                    {
                        Child.ToLog("SOCKET on data: Error GetSocketStatus=" + StatusNum, 4);
                    }
                }
        });
    };
    
    Engine.CloseSocket = function (Socket,Child,StrError,bSilently)
    {
        if(!Socket || Socket.WasClose)
            return;
        
        if(!bSilently && Socket.remoteAddress)
        {
            var Name;
            if(Child)
                Name = ChildName(Child);
            else
                Name = Socket.remoteAddress + ":" + Socket.remotePort;
            var Str = "CloseSocket: " + Name + " " + StrError;
            Engine.ToLog(Str, 4);
            if(Child)
                Engine.ToLogNet(Child, Str);
        }
        Engine.ClearSocket(Socket, Child);
        Socket.end();
    };
    
    Engine.ClearSocket = function (Socket,Child)
    {
        
        if(Child)
        {
            Child.Socket = undefined;
            Engine.OnDeleteConnect(Child, "ClearSocket");
        }
        
        Socket.WasClose = 1;
        SetSocketStatus(Socket, 0);
        Socket.WasChild = 0;
    };
    
    Engine.LinkSocketToChild = function (Socket,Child,ConnectType)
    {
        if(Socket.WasChild)
            ToLogTrace("Error LinkSocketToChild was Linked");
        
        Child.ConnectType = ConnectType;
        Socket.WasChild = 1;
        Child.Socket = Socket;
        if(ConnectType === "Server")
            Child.DirectIP = 1;
        SetSocketStatus(Socket, 100);
    };
    
    Engine.OnDeleteConnectNext = function (Child,StrError)
    {
        if(Child.Socket)
            Engine.CloseSocket(Child.Socket, Child, StrError);
    };
}

function InitAfter(Engine)
{
    Engine.CreateServer();
    
    Engine.CreateConnectionToChild = function (Child,F)
    {
        if(global.StopNetwork)
            return;
        
        var State = Engine.GetSocketStatus(Child);
        if(State === 100)
        {
            F(1);
        }
        else
        {
            if(State === 0)
            {
                Child.ToLog("Connect to " + Child.Name(), 4);
                Child.Socket = net.createConnection(Child.port, Child.ip, function ()
                {
                    if(Child.Socket)
                    {
                        Engine.SetEventsProcessing(Child.Socket, Child, "Server", 1);
                    }
                    F(!!Child.Socket);
                });
                SetSocketStatus(Child.Socket, 1);
                Engine.SetEventsProcessing(Child.Socket, Child, "Server", 0);
            }
            else
            {
                F(0);
            }
        }
    };
    
    Engine.CloseConnectionToChild = function (Child,StrError)
    {
        if(Child.Close)
        {
            Engine.ToError(Child, "Socket was closed", "t");
            return;
        }
        if(!Child.IsOpen())
        {
            Engine.ToError(Child, "Socket not was opened", "t");
            return;
        }
        
        if(Child.Socket)
            Child.ToLog("CloseSocket: " + Child.Socket.remoteAddress + ":" + Child.Socket.remotePort + " " + StrError, 4);
        else
            Child.ToLog(StrError, 4);
        
        Engine.CloseSocket(Child.Socket, Child, "", 1);
    };
    
    Engine.SENDTONETWORK = function (Child,Data)
    {
        if(global.StopNetwork)
            return;
        
        var State = Engine.GetSocketStatus(Child);
        if(State === 100)
        {
            Child.Socket.write(Buffer.from(Data));
        }
        else
        {
            Child.ToLog("ERROR SEND - NOT WAS CONNECT: State=" + State, 4);
        }
    };
    
    Engine.GetSocketStatus = function (Child)
    {
        if(!Child)
            return 0;
        
        var Socket = Child.Socket;
        if(Socket && Socket.SocketStatus)
        {
            if(Socket.SocketStatus !== 100)
            {
                var Delta = Date.now() - Socket.TimeStatus;
                if(Delta > JINN_CONST.MAX_WAIT_PERIOD_FOR_STATUS)
                {
                    return 0;
                }
            }
            return Socket.SocketStatus;
        }
        else
        {
            return 0;
        }
    };
}

function SetSocketStatus(Socket,Status)
{
    if(Socket && Socket.SocketStatus !== Status)
    {
        
        Socket.SocketStatus = Status;
        Socket.TimeStatus = Date.now();
    }
}

