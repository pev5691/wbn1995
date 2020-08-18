/*
 * @project: WBN
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * @reright: pev5691@yandex.ru
 * Web:
 * Twitter:
 * Telegram:
*/

"use strict";

require("./library.js");


const net = require("net");

var ConnectIDCount = 1;

module.exports = class CNode
{
    constructor(addrStr, ip, port)
    {
        this.addrStr = addrStr
        this.ip = ip.trim()
        this.port = port
        this.StartFindList = 0
        this.WhiteConnect = 0
        this.GrayConnect = 0
        
        this.POW = 0
        this.FirstTime = 0
        this.FirstTimeStr = ""
        this.LastTime = 0
        this.LastTimeError = 0
        this.LastTimeTransfer = 0
        this.FromIP = undefined
        this.FromPort = undefined
        
        this.Active = false
        this.Hot = false
        this.CanHot = false
        
        this.CountChildConnect = 0
        this.BlockProcessCount = 0
        
        this.VersionOK = false
        this.VersionNum = 0
        this.Delete = 0
        
        this.DeltaBan = 300
        this.Name = ""
        
        this.LogInfo = ""
        this.PrevInfo = ""
        
        this.StartTimeHot = 0
        this.NextHotDelta = 1000
        
        this.LevelsBit = 0
        
        this.ResetNode()
    }
    
    ResetNode()
    {
        
        this.LastTimeGetNode = 0
        this.DeltaGlobTime = 0
        this.CountDeltaTime = 0
        this.DeltaTime = 1000
        this.SumDeltaTime = 0
        this.TimeArr = []
        this.DeltaTimeAvg = 10000
        this.LastDeltaTime = 0
        
        this.TransferCount = 0
        this.StopGetBlock = 0
        this.LevelCount = 0
        this.LevelEnum = 100
        
        this.TimeMap = {}
        
        this.bInit = 1
        this.INFO = {}
        
        this.DoubleConnectCount = 0
        
        this.StartTimeConnect = 0
        this.NextConnectDelta = 1000
        this.StartTimeGetNodes = 0
        this.NextGetNodesDelta = 1000
        
        this.PingStart = 0
        this.NextPing = MIN_PERIOD_PING
        
        this.SendBlockArr = []
        this.LoadBlockArr = []
        this.SendBlockCount = 0
        this.LoadBlockCount = 0
        this.SendBlockCountAll = 0
        this.LoadBlockCountAll = 0
        
        this.WantHardTrafficArr = []
        this.WantHardTraffic = 0
        this.CanHardTraffic = 0
        
        this.BufWriteLength = 0
        this.BufWrite = Buffer.alloc(0)
        this.SendPacket = new RBTree(function (a,b)
        {
            return b.PacketNum - a.PacketNum;
        })
        
        this.ConnectCount = 0
        
        this.TrafficArr = []
        
        this.SendTrafficCurrent = 0
        this.SendTrafficLimit = 0
        
        this.ErrCount = 0
        this.ErrCountAll = 0
        
        var Prioritet = this.BlockProcessCount;
        SERVER.SetNodePrioritet(this, Prioritet)
        
        this.SendPacketNum = 0
        
        this.BlockNumDB = 0
        this.BlockNumDBMin = 0
    }
    
    ConnectStatus()
    {
        if(this.Socket)
            return GetSocketStatus(this.Socket);
        else
            return 0;
    }
    
    CreateConnect()
    {
        delete SERVER.BAN_IP[this.ip]
        
        let NODE = this;
        if(NODE.ConnectStatus())
        {
            if(NODE.ConnectStatus() === 100)
                SERVER.AddNodeToActive(NODE)
            return;
        }
        AddNodeInfo(NODE, "===CreateConnect===")
        
        CloseSocket(NODE.Socket, "CreateConnect")
        
        NODE.SocketStart = Date.now()
        ToLog("Connect to: " + NODE.ip, 3)
        
        NODE.Socket = net.createConnection(NODE.port, NODE.ip, function ()
        {
            if(NODE.Socket)
            {
                socketInit(NODE.Socket, "s")
                AddNodeInfo(NODE, "OK connected *" + NODE.Socket.ConnectID)
                
                NODE.Socket.ConnectToServer = true
                SetSocketStatus(NODE.Socket, 2)
            }
        })
        SetSocketStatus(NODE.Socket, 1)
        NODE.Socket.Node = NODE
        NODE.Socket.ConnectID = "~C" + ConnectIDCount
        ConnectIDCount++
        
        this.SetEventsProcessing(NODE.Socket, 0)
    }
    
    CreateReconnection()
    {
        let NODE = this;
        AddNodeInfo(NODE, "===CreateReconnection===")
        
        CloseSocket(NODE.Socket2, "CreateReconnection")
        
        NODE.SocketStart = Date.now()
        NODE.Socket2 = net.createConnection(NODE.port, NODE.ip, function ()
        {
            if(NODE.Socket2)
            {
                socketInit(NODE.Socket2, "s")
                AddNodeInfo(NODE, "OK Reconnected *" + NODE.Socket2.ConnectID)
                NODE.Socket2.ConnectToServer = true
                SetSocketStatus(NODE.Socket2, 2)
            }
        })
        SetSocketStatus(NODE.Socket2, 1)
        NODE.Socket2.Node = NODE
        NODE.Socket2.ConnectID = "~R" + ConnectIDCount
        ConnectIDCount++
        this.SetEventsProcessing(NODE.Socket2, 1)
    }
    
    SwapSockets()
    {
        if(!this.Socket2)
            return;
        
        var SocketOld = this.Socket;
        
        this.Socket = this.Socket2
        this.Socket2 = undefined
        
        this.Socket.Node = this
        SetSocketStatus(this.Socket, 100)
        this.Socket.Buf = SocketOld.Buf
        SERVER.LoadBufSocketList.remove(SocketOld)
        SERVER.LoadBufSocketList.insert(this.Socket)
        
        SocketOld.Buf = undefined
        SocketOld.WasClose = 1
        SocketOld.Node = undefined
        
        this.ErrCount = 0
    }
    
    SetEventsProcessing(Socket, Reconnection)
    {
        let SOCKET = Socket;
        let NODE = this;
        let RECONNECTION = Reconnection;
        
        SOCKET.on('data', function (data)
        {
            if(Socket.WasClose)
                return;
            
            if(GetSocketStatus(SOCKET) === 2)
            {
                SetSocketStatus(SOCKET, 3)
                
                var Buf = SERVER.GetDataFromBuf(data);
                if(Buf)
                {
                    var Res = NODE.SendPOWFromClientToServer(SOCKET, Buf.Data);
                    if(Res)
                    {
                        return;
                    }
                }
                
                CloseSocket(SOCKET, Buf ? "Method=" + Buf.Method : "=CLIENT ON DATA=")
            }
            else
                if(GetSocketStatus(SOCKET) === 3)
                {
                    var Buf = SERVER.GetDataFromBuf(data);
                    if(Buf)
                    {
                        var Str = Buf.Data;
                        if(Str && typeof Str === "string" && Str.substr(0, 24) === "WAIT_CONNECT_FROM_SERVER")
                        {
                            AddNodeInfo(NODE, "2. CLIENT OK POW")
                            
                            CloseSocket(SOCKET, "WAIT_CONNECT_FROM_SERVER")
                            NODE.WaitConnectFromServer = 1
                            NODE.WaitConnectIP = NODE.ip
                            try
                            {
                                NODE.SecretForReconnect = GetArrFromHex(Str.substr(25))
                            }
                            catch(e)
                            {
                                NODE.SecretForReconnect = []
                                ToLog(e)
                            }
                        }
                        else
                            if(Str === "OK")
                            {
                                NODE.NextConnectDelta = 1000
                                SetSocketStatus(SOCKET, 100)
                                AddNodeInfo(NODE, "4. CLIENT OK CONNECT")
                                
                                if(RECONNECTION)
                                {
                                    if(NODE.Socket)
                                        SetSocketStatus(NODE.Socket, 200)
                                }
                                else
                                {
                                    if(!NODE.Active)
                                        SERVER.AddNodeToActive(NODE)
                                }
                                
                                return;
                            }
                            else
                                if(Str === "SELF")
                                {
                                    NODE.Self = 1
                                }
                                else
                                    if(Str === "DOUBLE")
                                    {
                                    }
                                    else
                                    {
                                        AddNodeInfo(NODE, "ERROR:" + Str)
                                    }
                    }
                    
                    CloseSocket(SOCKET, Buf ? "Method=" + Buf.Method + ":" + Str : "=CLIENT ON DATA=")
                }
                else
                {
                    socketRead(Socket, data)
                    SERVER.OnGetFromTCP(NODE, Socket, data)
                }
        })
        SOCKET.on('end', function ()
        {
            if(GetSocketStatus(SOCKET))
                AddNodeInfo(NODE, "Get socket end *" + SOCKET.ConnectID + " Stat: " + SocketStatistic(SOCKET))
            
            if(GetSocketStatus(SOCKET) === 200)
            {
                NODE.SwapSockets()
                SOCKET.WasClose = 1
            }
        })
        SOCKET.on('close', function (err)
        {
            if(SOCKET.ConnectID && GetSocketStatus(SOCKET))
                AddNodeInfo(NODE, "Get socket close *" + SOCKET.ConnectID + " Stat: " + SocketStatistic(SOCKET))
            if(!SOCKET.WasClose)
            {
                if(GetSocketStatus(SOCKET) >= 2)
                {
                    
                    CloseSocket(SOCKET, "GET CLOSE")
                }
            }
            
            SetSocketStatus(SOCKET, 0)
        })
        SOCKET.on('error', function (err)
        {
            
            if(GetSocketStatus(SOCKET) >= 2)
            {
                SERVER.AddCheckErrCount(NODE, 1, "ERR##1 : socket")
                ADD_TO_STAT("ERRORS")
            }
        })
    }
    
    SendPOWFromClientToServer(Socket, data)
    {
        var Node = this;
        
        if(Node.ReconnectFromServer)
        {
            Node.ReconnectFromServer = 0
            
            var Info = this.GetPOWClientData(0);
            Info.Reconnect = 1
            Info.SecretForReconnect = Node.SecretForReconnect
            
            var BufWrite = BufLib.GetBufferFromObject(Info, FORMAT_POW_TO_SERVER, 1200, {});
            var BufAll = SERVER.GetBufFromData("POW_CONNECT7", BufWrite, 1);
            Socket.write(BufAll)
            return 1;
        }
        
        try
        {
            var Buf = BufLib.GetObjectFromBuffer(data, FORMAT_POW_TO_CLIENT, {});
        }
        catch(e)
        {
            SERVER.SendCloseSocket(Socket, "FORMAT_POW_TO_CLIENT")
            return 0;
        }
        
        if(CompareArr(Buf.addrArr, SERVER.addrArr) === 0)
        {
            Node.Self = true
            AddNodeInfo(Node, "END: SELF")
            SERVER.SendCloseSocket(Socket, "SELF")
            return;
        }
        
        var addrStr = GetHexFromAddres(Buf.addrArr);
        
        if(!Node.StartFindList && addrStr !== Node.addrStr)
        {
            AddNodeInfo(Node, "END: CHANGED ADDR: " + Node.addrStr.substr(0, 16) + "->" + addrStr.substr(0, 16))
            SERVER.SendCloseSocket(Socket, "ADDRESS_HAS_BEEN_CHANGED")
            return;
        }
        
        if(Node.addrStrTemp)
        {
            AddNodeInfo(Node, "Set Addr = " + addrStr)
            Node.addrStr = addrStr
            SERVER.CheckNodeMap(Node)
        }
        
        var Result = false;
        if(Buf.PubKeyType === 2 || Buf.PubKeyType === 3)
        {
            
            Result = secp256k1.verify(Buffer.from(shaarr(addrStr)), Buffer.from(Buf.Sign), Buffer.from([Buf.PubKeyType].concat(Buf.addrArr)))
            if(!Result)
            {
                Result = secp256k1.verify(Buffer.from(sha3(addrStr, 34)), Buffer.from(Buf.Sign), Buffer.from([Buf.PubKeyType].concat(Buf.addrArr)))
            }
        }
        if(!Result)
        {
            ToLog("END: ERROR_SIGN_SERVER ADDR: " + addrStr.substr(0, 16) + " from ip: " + Socket.remoteAddress)
            AddNodeInfo(Node, "END: ERROR_SIGN_SERVER ADDR: " + addrStr.substr(0, 16) + " from ip: " + Socket.remoteAddress)
            
            SERVER.SendCloseSocket(Socket, "ERROR_SIGN_SERVER")
            return;
        }
        
        if(Buf.MIN_POWER_POW_HANDSHAKE > 1 + MIN_POWER_POW_HANDSHAKE)
        {
            ToLog("END: BIG_MIN_POWER_POW_HANDSHAKE ADDR: " + addrStr.substr(0, 16) + " from ip: " + Socket.remoteAddress)
            return 0;
        }
        
        var TestNode = SERVER.NodesMap[addrStr];
        if(TestNode && TestNode !== Node)
        {
            
            if(GetSocketStatus(TestNode.Socket))
            {
                AddNodeInfo(Node, "DoubleConnection find")
                Node.DoubleConnection = true
                return 0;
            }
            else
            {
                AddNodeInfo(Node, "DoubleConnection find")
                TestNode.DoubleConnection = true
            }
        }
        
        Node.PubKey = Buffer.from([Buf.PubKeyType].concat(Buf.addrArr))
        Node.addrArr = Buf.addrArr
        Node.addrStr = addrStr
        if(CompareArr(SERVER.addrArr, Node.addrArr) === 0)
        {
            Node.Self = 1
            return 0;
        }
        var Hash = shaarr2(Buf.addrArr, Buf.HashRND);
        var nonce = CreateNoncePOWExternMinPower(Hash, 0, Buf.MIN_POWER_POW_HANDSHAKE);
        
        var Info;
        if(WALLET.WalletOpen && IsDeveloperAccount(WALLET.PubKeyArr))
        {
            Info = this.GetPOWClientData(0)
            Info.Reconnect = 255
            Info.Sign = secp256k1.sign(SHA3BUF(Hash), WALLET.KeyPair.getPrivateKey('')).signature
            Result = CheckDevelopSign(Hash, Info.Sign)
            if(!Result)
            {
                throw "ERROR DEVELOPSIGN!";
            }
        }
        else
        {
            Info = this.GetPOWClientData(nonce)
            Info.PubKeyType = SERVER.PubKeyType
            Info.Sign = secp256k1.sign(Buffer.from(Hash), SERVER.KeyPair.getPrivateKey('')).signature
        }
        
        var BufWrite = BufLib.GetBufferFromObject(Info, FORMAT_POW_TO_SERVER, 1200, {});
        var BufAll = SERVER.GetBufFromData("POW_CONNECT6", BufWrite, 1);
        Socket.write(BufAll)
        return 1;
    }
    
    GetPOWClientData(nonce)
    {
        var Node = this;
        var Info = {};
        
        Info.DEF_NETWORK = GetNetworkName()
        Info.DEF_VERSION = DEF_VERSION
        Info.DEF_CLIENT = DEF_CLIENT
        Info.addrArr = SERVER.addrArr
        Info.ToIP = Node.ip
        Info.ToPort = Node.port
        Info.FromIP = SERVER.ip
        Info.FromPort = SERVER.port
        Info.nonce = nonce
        Info.Reconnect = 0
        Info.SendBytes = 0
        Info.SecretForReconnect = []
        Info.Reserv = []
        
        if(GrayConnect())
            Info.GrayConnect = 1
        
        return Info;
    }
    
    write(BufWrite)
    {
        if(!this.Socket)
            return;
        
        socketWrite(this.Socket, BufWrite)
        
        try
        {
            this.Socket.write(BufWrite)
        }
        catch(e)
        {
            ToError(e)
            this.Socket.WasClose = 1
            this.Socket.SocketStatus = 0
            this.Socket.Node = undefined
        }
    }
};

global.socketInit = function (Socket,Str)
{
    if(!Socket)
        return;
    
    Socket.GetBytes = 0;
    Socket.SendBytes = 0;
    
    Socket.ConnectID = "" + ConnectIDCount + Str;
    
    ConnectIDCount++;
}

global.socketRead = function (Socket,Buf)
{
    Socket.GetBytes += Buf.length;
}

global.socketWrite = function (Socket,Buf)
{
    Socket.SendBytes += Buf.length;
}

global.CloseSocket = function (Socket,StrError,bHide)
{
    if(!Socket || Socket.WasClose)
    {
        if(Socket)
            Socket.SocketStatus = 0;
        return;
    }
    
    var Node = Socket.Node;
    if(Socket.Node && Socket.Node.Socket2 === Socket && Socket.Node.Socket && Socket.Node.Socket.SocketStatus === 200)
        SetSocketStatus(Socket.Node.Socket, 100);
    
    var StrNode = NodeInfo(Socket.Node);
    Socket.WasClose = 1;
    Socket.SocketStatus = 0;
    Socket.Node = undefined;
    Socket.end();
    
    if(!bHide)
        AddNodeInfo(Node, "CLOSE " + StrNode + "  *" + Socket.ConnectID + " - " + StrError);
}

function SetSocketStatus(Socket,Status)
{
    if(Socket && Socket.SocketStatus !== Status)
    {
        if(Status === 100 && (Socket.SocketStatus !== 3 && Socket.SocketStatus !== 200))
        {
            ToLogTrace("===================ERROR=================== " + Status);
            return;
        }
        if(Status === 100 && Socket.Node)
            Socket.Node.LastTime = GetCurrentTime() - 0;
        
        Socket.SocketStatus = Status;
        Socket.TimeStatus = Date.now();
    }
}

function GetSocketStatus(Socket)
{
    if(Socket && Socket.SocketStatus)
    {
        if(Socket.SocketStatus !== 100)
        {
            var Delta = Date.now() - Socket.TimeStatus;
            if(Delta > MAX_WAIT_PERIOD_FOR_STATUS)
            {
                CloseSocket(Socket, "MAX_WAIT_PERIOD_FOR_STATUS = " + Socket.SocketStatus + " time = " + Delta);
            }
        }
        return Socket.SocketStatus;
    }
    else
    {
        return 0;
    }
}

function SocketInfo(Socket)
{
    if(Socket)
        return "*" + Socket.ConnectID;
    else
        return "";
}
function SocketStatistic(Socket)
{
    if(!Socket)
        return "";
    
    var Str = "";
    if(!Socket.SendBytes)
        Socket.SendBytes = 0;
    if(!Socket.GetBytes)
        Socket.GetBytes = 0;
    
    if(Socket.SendBytes)
        Str += " Send=" + Socket.SendBytes;
    if(Socket.GetBytes)
        Str += " Get=" + Socket.GetBytes;
    if(GetSocketStatus(Socket))
        Str += " SocketStatus=" + GetSocketStatus(Socket);
    if(Str === "")
        Str = "0";
    return Str;
}
function NodeInfo(Node)
{
    if(Node)
        return "" + Node.ip + ":" + Node.port + " " + SocketInfo(Node.Socket);
    else
        return "";
}
function NodeName(Node)
{
    if(!Node)
        return "";
    if(Node.Name)
        return Node.Name;
    
    if(LOCAL_RUN)
        return "" + Node.port;
    else
    {
        return "" + Node.ip + ":" + Node.addrStr.substr(0, 6) + "(" + Node.BlockProcessCount + ")";
    }
}

function FindNodeByAddr(Addr,bConnect)
{
    var Node = SERVER.NodesMap[Addr.trim()];
    if(Node && Node.ConnectStatus() === 100)
        return Node;
    
    if(Node && bConnect)
    {
        Node.NextConnectDelta = 1000;
        SERVER.StartConnectTry(Node);
        return false;
    }
    return undefined;
}

function AddNodeInfo(Node,Str,bSet)
{
    if(!global.STAT_MODE)
        return;
    
    if(!Node)
        return;
    if(!Node.LogInfo)
        Node.LogInfo = "";
    if(bSet)
    {
        Node.LogInfo = "";
    }
    else
    {
        if(Node.Socket && Node.Socket.Info)
        {
            Node.LogInfo += Node.Socket.Info + "\n";
            Node.Socket.Info = "";
        }
    }
    
    if(Node.LogInfo.length > 1000)
    {
        Node.PrevInfo = Node.LogInfo;
        Node.LogInfo = "";
    }
    {
        var timesend = GetStrOnlyTimeUTC();
        Str = timesend + " " + Str;
        Node.LogInfo += Str + "\n";
    }
}

global.SocketStatistic = SocketStatistic;
global.GetSocketStatus = GetSocketStatus;
global.SetSocketStatus = SetSocketStatus;
global.NodeInfo = NodeInfo;
global.NodeName = NodeName;
global.SocketInfo = SocketInfo;



global.FindNodeByAddr = FindNodeByAddr;
global.AddNodeInfo = AddNodeInfo;
