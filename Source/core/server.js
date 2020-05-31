/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


"use strict";

const net = require("net");
const dgram = require("dgram");

const crypto = require('crypto');

require("./library.js");
require("./crypto-library");

require("./upnp.js");


const HARD_PACKET_PERIOD = 20;

global.BUF_TYPE = 1;
global.STR_TYPE = 2;
global.MAX_STR_BUF_DATA = 200;


global.MAX_CONNECTION_ACTIVE = 40;
var MAX_CONNECTION_ANOTHER = 40;

const TRAFIC_LIMIT_NODE_1S = MAX_BLOCK_SIZE * 1.25;
const TRAFIC_LIMIT_1S = 8 * TRAFIC_LIMIT_NODE_1S;

global.STAT_PERIOD = CONSENSUS_PERIOD_TIME / 5;
const TRAFIC_LIMIT_SEND = TRAFIC_LIMIT_1S * STAT_PERIOD / 1000;
const TRAFIC_LIMIT_NODE = TRAFIC_LIMIT_NODE_1S * STAT_PERIOD / 1000;
const BUF_PACKET_SIZE = 32 * 1024;

global.FORMAT_POW_TO_CLIENT = "{addrArr:hash,HashRND:hash,MIN_POWER_POW_HANDSHAKE:uint,PubKeyType:byte,Sign:arr64,Reserve:arr33}";
global.FORMAT_POW_TO_SERVER = "{\
        DEF_NETWORK:str15,\
        DEF_VERSION:str9,\
        DEF_CLIENT:str16, \
        addrArr:addres, \
        ToIP:str26,\
        ToPort:uint16, \
        FromIP:str26,\
        FromPort:uint16, \
        nonce:uint,\
        Reconnect:byte,\
        SendBytes:uint,\
        PubKeyType:byte,\
        Sign:arr64,\
        SecretForReconnect:arr20,\
        GrayConnect:byte,\
        Reserve:arr14\
    }";

const WorkStructPacketSend = {};
const FORMAT_PACKET_SEND_TCP = "{\
    PacketSize:uint,\
    NumXORRND:uint,\
    Method:str25,\
    NodeTime:time,\
    Length:uint,\
    ContextID:hash,\
    TypeData:byte,\
    Hash:hash,\
    Data:data,\
    }";


module.exports = class CTransport extends require("./connect")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        
        this.UseRNDHeader = UseRNDHeader
        
        this.BAN_IP = {}
        
        if(RunIP)
            this.ip = RunIP.trim()
        this.port = RunPort
        
        if(global.TEST_JINN)
            return;
        
        this.CanSend = 0
        
        this.SendFormatMap = {}
        
        this.ActualNodes = new RBTree(function (a,b)
        {
            if(b.Prioritet !== a.Prioritet)
                return b.Prioritet - a.Prioritet;
            return CompareArr(a.addrArr, b.addrArr);
        })
        this.SendTrafficFree = 0
        
        this.LoadedPacketNum = 0
        this.LoadedSocketNum = 0
        
        setInterval(this.DoLoadBuf.bind(this), 1)
        this.LoadBufSocketList = new RBTree(function (a,b)
        {
            if(b.SocketPrioritet !== a.SocketPrioritet)
                return b.SocketPrioritet - a.SocketPrioritet;
            return a.SocketNum - b.SocketNum;
        })
        
        this.BusyLevel = 0
        this.LastTimeHard = 0
        this.LastTimeHardOK = 0
        setInterval(this.DoHardPacketForSend.bind(this), HARD_PACKET_PERIOD)
        this.HardPacketForSend = new RBTree(function (a,b)
        {
            if(b.BlockProcessCount === a.BlockProcessCount)
                return a.PacketNum - b.PacketNum;
            else
                return b.BlockProcessCount - a.BlockProcessCount;
        })
        
        setInterval(this.DoSendPacket.bind(this), 2)
        setInterval(this.DoSendBuf.bind(this), 1)
        
        var Map = {};
        this.MethodTiming = Map
        MethodTiming:
        {
            
            Map["TRANSFER"] = {Period:700, Hot:1}
            Map["TRANSFER2"] = {Period:700, Hot:1}
            
            Map["TIME"] = {Period:2000, LowVersion:1, Hard:1, Immediately:1}
            
            Map["PING"] = {Period:4000, LowVersion:1, Hard:1, Immediately:1}
            Map["PONG"] = {Period:0, LowVersion:1, Immediately:1}
            
            Map["ADDLEVELCONNECT"] = {Period:1000, Hard:1}
            Map["RETADDLEVELCONNECT"] = {Period:0}
            Map["DISCONNECTHOT"] = {Period:1000, Hard:1}
            Map["TRANSACTION"] = {Period:PERIOD_GET_BLOCK, Hard:1}
            
            Map["GETBLOCKHEADER"] = {Period:PERIOD_GET_BLOCK, Hard:2, Process:global.STATIC_PROCESS}
            Map["GETBLOCKHEADER100"] = {Period:PERIOD_GET_BLOCK, Hard:2, Process:global.STATIC_PROCESS}
            Map["GETBLOCK"] = {Period:PERIOD_GET_BLOCK, Hard:2, Process:global.STATIC_PROCESS}
            
            Map["GETNODES"] = {Period:1000, Hard:1, LowVersion:1, IsAddrList:1}
            Map["RETGETNODES"] = {Period:0, IsAddrList:1}
            
            Map["GETCODE"] = {Period:10000, Hard:1, LowVersion:1, Process:global.STATIC_PROCESS}
            
            Map["RETBLOCKHEADER"] = {Period:0}
            Map["RETBLOCKHEADER100"] = {Period:0}
            Map["RETGETBLOCK"] = {Period:0}
            Map["RETCODE"] = {Period:0}
            
            Map["GETREST"] = {Period:1000, Hard:2, Process:global.STATIC_PROCESS}
            Map["RETREST"] = {Period:0}
            
            Map["GETSMART"] = {Period:1000, Hard:2, Process:global.STATIC_PROCESS}
            Map["RETSMART"] = {Period:0}
        }
        
        if(global.LOCAL_RUN)
        {
            this.ip = "127.0.0.1"
            global.LISTEN_IP = this.ip
            global.INTERNET_IP_FROM_STUN = this.ip
        }
        
        if(!this.VirtualMode)
            this.StartServer()
        
        this.CurrentTimeStart = 0
        this.CurrentTimeValues = {}
        
        this.LoadNodesFromFile()
    }
    
    GetF(Method, bSend)
    {
        var name = Method + "-" + bSend;
        var format = this.SendFormatMap[name];
        if(!format)
        {
            var F = this.constructor[Method + "_F"];
            if(typeof F === "function")
            {
                format = {struct:F(bSend), length:8096, wrk:{}}
            }
            else
            {
                format = "{}"
            }
            this.SendFormatMap[name] = format
        }
        return format;
    }
    SendF(Node, Info, Length)
    {
        var format = this.GetF(Info.Method, true);
        if(!Length)
            Length = format.length
        Info.Data = BufLib.GetBufferFromObject(Info.Data, format.struct, Length, format.wrk)
        
        this.Send(Node, Info, 1)
    }
    DataFromF(Info, bSendFormat)
    {
        var format = this.GetF(Info.Method, bSendFormat);
        try
        {
            var Data = BufLib.GetObjectFromBuffer(Info.Data, format.struct, format.wrk);
            return Data;
        }
        catch(e)
        {
            ToLog(e)
            return {};
        }
    }
    
    ADD_CURRENT_STAT_TIME(Key, Value)
    {
        var TimeNum = Math.floor(Date.now() / STAT_PERIOD);
        if(this.CurrentTimeStart !== TimeNum)
            this.CurrentTimeValues = {}
        this.CurrentTimeStart = TimeNum
        if(!this.CurrentTimeValues[Key])
            this.CurrentTimeValues[Key] = 0
        this.CurrentTimeValues[Key] += Value
    }
    GET_CURRENT_STAT_TIME(Key)
    {
        var TimeNum = Math.floor(Date.now() / STAT_PERIOD);
        if(this.CurrentTimeStart === TimeNum)
        {
            var Value = this.CurrentTimeValues[Key];
            if(Value === undefined)
                return 0;
            else
                return Value;
        }
        else
        {
            return 0;
        }
    }
    
    RecalcSendStatictic()
    {
        var TimeNum = Math.floor(Date.now() / STAT_PERIOD);
        if(this.SendStatNum === TimeNum)
            return;
        this.SendStatNum = TimeNum
        
        var Period = CONSENSUS_PERIOD_TIME / STAT_PERIOD;
        this.SendTrafficFree = TRAFIC_LIMIT_SEND
        var it = this.ActualNodes.iterator(), Node;
        while((Node = it.next()) !== null)
        {
            {
                var arr = Node.TrafficArr;
                arr.push(Node.BufWriteLength)
                Node.BufWriteLength = 0
                
                if(arr.length > 5 * Period)
                {
                    arr.shift()
                }
                else
                {
                    if(arr.length < 3 * Period)
                        continue;
                }
                
                var arrAvg = [], arrK = [];
                var valNext = CalcStatArr(arr, arrAvg, arrK, Period);
                valNext = Math.min(valNext, TRAFIC_LIMIT_NODE)
                Node.SendTrafficLimit = Math.min(this.SendTrafficFree, valNext * 1.1)
                this.SendTrafficFree -= Node.SendTrafficLimit
            }
            
            Node.SendTrafficCurrent = 0
            ADD_TO_STAT("MAX:NODE_TRAFFIC_LIMIT:" + NodeName(Node), 1000 / STAT_PERIOD * Node.SendTrafficLimit / 1024, 1)
        }
        this.SendTrafficFree += TRAFIC_LIMIT_NODE
        
        ADD_TO_STAT("SEND_TRAFFIC_FREE", this.SendTrafficFree / 1024)
    }
    
    OnGetMethod(Info, CurTime)
    {
        
        if(DEBUG_MODE)
        {
            var Str = "";
            if(Info.Data && Info.Data.Length)
                Str = " LENGTH=" + Info.Data.Length
            TO_DEBUG_LOG("GET:" + Info.Method + Str + " from: Node=" + NodeInfo(Info.Node))
        }
        
        if(global.ADDRLIST_MODE)
        {
            var StrOK = ",HAND,GETNODES,";
            if(StrOK.indexOf("," + Info.Method + ",") ===  - 1)
                return;
        }
        
        Info.Node.LastTime = CurTime - 0
        
        if(Info.Context && typeof Info.Context.F === "function")
        {
            Info.Context.F(Info, CurTime)
        }
        else
        {
            var F = this[Info.Method.toUpperCase()];
            if(typeof F === "function")
            {
                F.bind(this)(Info, CurTime)
            }
            else
            {
                TO_ERROR_LOG("TRANSPORT", 20, "Method '" + Info.Method + "' not found Socket=*" + Info.Socket.ConnectID, "node", Info.Node)
                this.AddCheckErrCount(Info.Node, 1, "Method not found")
            }
        }
    }
    
    GetActualNodes()
    {
        var Arr = [];
        var it = this.ActualNodes.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            if(GetSocketStatus(Item.Socket) >= 100)
                Arr.push(Item)
            else
            {
                this.DeleteNodeFromActive(Item)
            }
        }
        return Arr;
    }
    
    NodeIp(Node)
    {
        if(Node.ip_arrival)
        {
            return {ip:Node.ip_arrival, port:Node.port_arrival};
        }
        else
        {
            return {ip:Node.ip, port:Node.port};
        }
    }
    
    SetXORHeader(buf, bForce)
    {
        if(this.UseRNDHeader || bForce)
        {
            var HashHashSign = shaarr(buf.slice(buf.length - 32, buf.length));
            for(var i = 0; i < 32; i++)
                buf[i] = HashHashSign[i] ^ buf[i]
        }
    }
    
    WasBanIP(rinfo)
    {
        if(!rinfo || !rinfo.address)
            return false;
        
        var Key = "" + rinfo.address.trim();
        var Stat = this.BAN_IP[Key];
        if(Stat)
        {
            if(Stat.TimeTo > (GetCurrentTime(0) - 0))
                return true;
        }
        
        return false;
    }
    
    NodeInBan(Node)
    {
        return this.WasBanIP({address:Node.ip});
    }
    
    DeleteNodeFromActiveByIP(ip)
    {
        var Arr = this.GetActualNodes();
        for(var i = 0; i < Arr.length; i++)
        {
            var Node = Arr[i];
            if(Node.ip === ip)
            {
                this.DeleteNodeFromActive(Node)
            }
        }
    }
    
    AddToBan(Node, Str)
    {
        if(global.NeedRestart)
            return;
        this.DeleteNodeFromActive(Node)
        
        if(!Node.ip)
            return;
        
        var Key = "" + Node.ip.trim();
        
        if(!Node.DeltaBan)
            Node.DeltaBan = 300
        if(Node.DeltaBan > 1000000)
            Node.DeltaBan = 1000000
        Node.DeltaBan = Node.DeltaBan * 2
        var TimeTo = (GetCurrentTime(0) - 0) + Node.DeltaBan * 1000;
        this.BAN_IP[Key] = {TimeTo:TimeTo}
        Node.BlockProcessCount = 0
        
        this.DeleteNodeFromActiveByIP(Node.ip)
        
        ToLog("ADD TO BAN: " + NodeName(Node) + " " + Str, 2)
        ADD_TO_STAT("AddToBan")
    }
    
    AddToBanIP(ip, Str, Period)
    {
        if(!Period)
            Period = 600 * 1000
        var Key = "" + ip.trim();
        this.BAN_IP[Key] = {TimeTo:(GetCurrentTime(0) - 0) + Period}
        
        this.DeleteNodeFromActiveByIP(ip)
        
        ToLog("ADD TO BAN:: " + Key + " " + Str)
        ADD_TO_STAT("AddToBanIP")
    }
    
    OnPacketTCP(Meta)
    {
        var startTime = process.hrtime();
        
        ADD_TO_STAT("USEPACKET")
        var CurTime = GetCurrentTime();
        Meta.Node.LastTime = CurTime - 0
        
        if(Meta.MethodTiming.Process && Meta.MethodTiming.Process.Worker)
        {
            var Data = this.DataFromF(Meta);
            Meta.MethodTiming.Process.Worker.send({cmd:Meta.Method, Data:Data, addrStr:Meta.Node.addrStr, NodeName:NodeName(Meta.Node),
                Context:Meta.Context})
        }
        else
        {
            this.OnGetMethod(Meta, CurTime)
        }
        
        ADD_TO_STAT_TIME("MAX:TIME_USE_PACKET", startTime)
        ADD_TO_STAT_TIME("TIME_USE_PACKET", startTime)
        ADD_TO_STAT_TIME("MAX:TIME_USE_PACKET:" + Meta.Method, startTime)
    }
    
    GetBufFromData(Method, Data, TypeData, ContextID)
    {
        var BufData;
        if(TypeData === BUF_TYPE)
        {
            BufData = Data
        }
        else
            if(TypeData === STR_TYPE)
            {
                BufData = Buffer.from(Data.substr(0, MAX_STR_BUF_DATA))
            }
            else
            {
                if(Data === undefined)
                {
                    TypeData = BUF_TYPE
                    BufData = Buffer.alloc(0)
                }
                else
                {
                    throw "ERROR TYPE DATA";
                }
            }
        
        var BUF = {};
        BUF.PacketSize = 0
        BUF.NumXORRND = 0
        BUF.Method = Method
        BUF.NodeTime = GetCurrentTime()
        BUF.TypeData = TypeData
        BUF.Length = BufData.length
        BUF.Data = BufData
        BUF.ContextID = ContextID
        BUF.Hash = this.GetHashFromData(BUF)
        
        var BufWrite = BufLib.GetBufferFromObject(BUF, FORMAT_PACKET_SEND_TCP, BufData.length + 300, WorkStructPacketSend);
        
        BufWrite.len = 0
        BufLib.Write(BufWrite, BufWrite.length, "uint")
        
        return BufWrite;
    }
    
    GetDataFromBuf(buf)
    {
        try
        {
            var Meta = BufLib.GetObjectFromBuffer(buf, FORMAT_PACKET_SEND_TCP, WorkStructPacketSend);
        }
        catch(e)
        {
            TO_ERROR_LOG("TRANSPORT", 640, "Error parsing Buffer")
            return undefined;
        }
        var Hash = this.GetHashFromData(Meta);
        if(CompareArr(Hash, Meta.Hash) !== 0)
        {
            if(global.WATCHDOG_DEV)
                ToLog("TRANSPORT: Error hash Buffer", 2)
            return undefined;
        }
        
        if(Meta.TypeData === STR_TYPE)
        {
            Meta.Data = Meta.Data.slice(0, MAX_STR_BUF_DATA).toString()
        }
        
        return Meta;
    }
    
    GetHashFromData(Info)
    {
        return shaarr(Info.Method + Info.Length + "-" + (Info.NodeTime - 0));
    }
    
    OnGetFromTCP(Node, Socket, Buf)
    {
        if(!Node)
            return;
        if(!Node.Socket)
            Node.Socket = Socket
        
        if(!Socket.Buf || Socket.Buf.length === 0)
        {
            Socket.Buf = Buf
        }
        else
        {
            Socket.Buf = Buffer.concat([Socket.Buf, Buf])
        }
        if(!Socket.SocketNum)
        {
            this.LoadedSocketNum++
            
            Socket.SocketNum = this.LoadedSocketNum
            Socket.SocketPrioritet = Node.BlockProcessCount
        }
        
        this.LoadBufSocketList.insert(Socket)
    }
    
    DoLoadBuf()
    {
        var Socket = this.LoadBufSocketList.min();
        if(!Socket)
            return;
        this.LoadBufSocketList.remove(Socket)
        if(Socket.WasClose)
            return;
        
        while(true)
        {
            if(Socket.Buf && Socket.Buf.length > 6)
            {
                ADD_TO_STAT("MAX:BUFFE_LOAD_SIZE", Socket.Buf.length / 1024)
                
                Socket.Buf.len = 0
                var PacketSize = BufLib.Read(Socket.Buf, "uint");
                if(PacketSize > MAX_PACKET_LENGTH)
                {
                    this.SendCloseSocket(Socket, "MAX_PACKET_LENGTH:" + PacketSize)
                    break;
                }
                else
                    if(Socket.Buf.length >= PacketSize)
                    {
                        var data = Socket.Buf.slice(0, PacketSize);
                        Socket.Buf = Socket.Buf.slice(PacketSize, Socket.Buf.length)
                        var Res = this.DoDataFromTCP(Socket, data);
                        if(Res)
                        {
                            continue;
                        }
                    }
            }
            
            break;
        }
    }
    
    DoDataFromTCP(Socket, buf)
    {
        this.LoadedPacketNum++
        
        var Node = Socket.Node;
        if(!Node)
            return 0;
        
        var startTime = process.hrtime();
        ADD_TO_STAT("GETDATA(KB)", buf.length / 1024)
        ADD_TO_STAT("GETDATA(KB):" + NodeName(Node), buf.length / 1024, 1)
        if(!Node.TransferSize)
            Node.TransferSize = 0
        Node.TransferSize += buf.length / 1024
        Node.TransferBlockNumFix = this.CurrentBlockNum
        
        var Buf = this.GetDataFromBuf(buf);
        if(!Buf)
        {
            this.AddCheckErrCount(Node, 1, "Err GetDataFromBuf")
            this.SendCloseSocket(Socket, "FORMAT_PACKET_SEND_TCP")
            return 0;
        }
        
        ADD_TO_STAT("GET:" + Buf.Method)
        ADD_TO_STAT("GET:(KB)" + Buf.Method, buf.length / 1024)
        ADD_TO_STAT("GET:" + Buf.Method + ":" + NodeName(Node), 1, 1)
        
        var Param = this.MethodTiming[Buf.Method];
        if(this.StopDoSendPacket(Param, Node, Buf.Method))
        {
            return 1;
        }
        
        if(!IsZeroArr(Buf.ContextID))
        {
            Buf.Context = global.ContextPackets.LoadValue(Buf.ContextID)
        }
        
        if(!Buf.Context)
        {
            if(Param && Param.Period === 0 && Buf.Method !== "RETBLOCKHEADER")
            {
                this.AddCheckErrCount(Node, 1)
                return;
            }
            Buf.Context = {}
        }
        Buf.Context.ContextID = Buf.ContextID
        this.MethodTimeProcess(Node, Buf.Method, Buf.Context)
        
        Buf.Node = Node
        Buf.Socket = Socket
        Buf.MethodTiming = Param
        
        if(!global.ADDRLIST_MODE || Param.IsAddrList)
        {
            if(Param.Hard)
            {
                if(Param.Immediately && this.HardPacketForSend.size <= 3)
                {
                    this.OnPacketTCP(Buf)
                }
                else
                {
                    Buf.PacketNum = this.LoadedPacketNum
                    Buf.BlockProcessCount = Node.BlockProcessCount
                    Buf.TimeLoad = Date.now()
                    this.HardPacketForSend.insert(Buf)
                }
            }
            else
            {
                this.OnPacketTCP(Buf)
            }
        }
        
        ADD_TO_STAT_TIME("MAX:TIMEDOGETDATA", startTime)
        return 1;
    }
    
    MethodTimeProcess(Node, Method, Context)
    {
        if(Method != "RETBLOCKHEADER" && Method != "RETGETBLOCK")
            return;
        
        var Time1 = Context.TimeMethodSend;
        if(!Time1)
            return;
        var Arr = Node.TimeArr;
        
        var Time2 = GetCurrentTime(0) - 0;
        var Delta = Time2 - Time1;
        Arr.unshift(Delta)
        if(Arr.length > 20)
            Arr.length = 20
        
        var SumDelta = 0;
        for(var i = 0; i < Arr.length; i++)
            SumDelta += Arr[i]
        
        Node.DeltaTimeAvg = Math.floor(SumDelta / Arr.length)
        Node.LastDeltaTime = Delta
    }
    
    StopDoSendPacket(Param, Node, Name)
    {
        
        var CurTime = GetCurrentTime(0) - 0;
        
        if(!Param)
        {
            ADD_TO_STAT("STOP_METHOD")
            ADD_TO_STAT("STOP_METHOD:NO")
            this.AddCheckErrCount(Node, 1)
            return 1;
        }
        
        if(Param.Hot && !Node.Hot)
        {
            this.AddCheckErrCount(Node, 1)
            return 0;
        }
        
        if(Param.Period && !Node.VersionOK && !Param.LowVersion)
        {
            ADD_TO_STAT("STOP_METHOD")
            ADD_TO_STAT("STOP_METHOD:LOWVERSION:" + Name)
            return 1;
        }
        
        if(global.STOPGETBLOCK && Param.Hard === 2 && Node.BlockProcessCount < 1000000)
        {
            Node.NextPing = 1 * 1000
            
            ADD_TO_STAT("STOP_METHOD")
            ADD_TO_STAT("STOP_METHOD:STOPGETBLOCK:" + Name)
            this.AddCheckErrCount(Node, 0.5)
            return 1;
        }
        
        var ArrTime = Node.TimeMap[Name];
        if(!ArrTime)
        {
            ArrTime = [0, 0, 0]
            
            Node.TimeMap[Name] = ArrTime
        }
        
        ArrTime.sort(function (a,b)
        {
            return a - b;
        })
        
        var Delta = CurTime - ArrTime[0];
        if(Delta < Param.Period)
        {
            ADD_TO_STAT("STOP_METHOD")
            ADD_TO_STAT("STOP_METHOD:" + Name)
            
            this.AddCheckErrCount(Node, 1)
            return 1;
        }
        
        ArrTime[0] = CurTime
        return 0;
    }
    
    DoHardPacketForSend()
    {
        ADD_TO_STAT("MAX:BUSY_LEVEL", this.BusyLevel)
        ADD_TO_STAT("MAX:HARD_PACKET_SIZE", this.HardPacketForSend.size)
        
        var Delta = Date.now() - this.LastTimeHard;
        this.LastTimeHard = Date.now()
        if(Delta > global.HARD_PACKET_PERIOD120 * HARD_PACKET_PERIOD / 100)
        {
            ADD_TO_STAT("HARD_PACKET_PERIOD120")
            
            var Delta2 = Date.now() - this.LastTimeHardOK;
            if(Delta2 > 100)
            {
                var Info = this.HardPacketForSend.min();
                this.RiseBusyLevelByInfo(Info)
            }
            return;
        }
        if(this.BusyLevel)
            this.BusyLevel = this.BusyLevel / 1.1
        
        this.LastTimeHardOK = Date.now()
        
        ADD_TO_STAT("HARD_PACKET_PERIOD")
        
        this.DoHardPacketForSendNext()
    }
    RiseBusyLevelByInfo(Info)
    {
        if(!Info)
            return;
        
        if(!this.BusyLevel)
            this.BusyLevel = 1
        if(Info.BlockProcessCount > this.BusyLevel)
            this.BusyLevel = Info.BlockProcessCount + 1
        if(this.BusyLevel <= 0)
            this.BusyLevel = 1
    }
    DropBusyLevelByInfo(Info)
    {
        if(!Info)
            return;
        
        if(this.BusyLevel > Info.BlockProcessCount)
            this.BusyLevel = Info.BlockProcessCount - 1
        if(this.BusyLevel < 0)
            this.BusyLevel = 0
    }
    
    DoHardPacketForSendNext()
    {
        var Info = this.HardPacketForSend.min();
        if(!Info)
        {
            this.BusyLevel = 0
            return;
        }
        this.DropBusyLevelByInfo(Info)
        
        this.HardPacketForSend.remove(Info)
        this.OnPacketTCP(Info)
        
        ADD_TO_STAT("DO_HARD_PACKET")
        ADD_TO_STAT("DO_HARD_PACKET:" + Info.Method)
        
        var DeltaTime = Date.now() - Info.TimeLoad;
        if(this.HardPacketForSend.size && DeltaTime > PACKET_ALIVE_PERIOD / 2)
        {
            ADD_TO_STAT("DELETE_HARD_PACKET_OLD", this.HardPacketForSend.size)
            this.HardPacketForSend.clear()
            return;
        }
        
        var MaxCount = 20;
        while(Info = this.HardPacketForSend.max())
        {
            var DeltaTime = Date.now() - Info.TimeLoad;
            if(DeltaTime > PACKET_ALIVE_PERIOD / 2 || !Info.Node.Socket || Info.Node.Socket.WasClose)
            {
                this.HardPacketForSend.remove(Info)
                
                if(DeltaTime > PACKET_ALIVE_PERIOD / 2)
                {
                    this.RiseBusyLevelByInfo(Info)
                    
                    Info.Node.NextPing = 1 * 1000
                    this.AddCheckErrCount(Info.Node, 0.2)
                    
                    ADD_TO_STAT("DELETE_HARD_PACKET_OLD")
                    ADD_TO_STAT("DELETE_HARD_PACKET_OLD:" + Info.Method)
                }
                else
                {
                    ADD_TO_STAT("DELETE_HARD_PACKET_NO_ALIVE")
                }
            }
            MaxCount--
            if(MaxCount <= 0)
                break;
        }
    }
    Send(Node, Info, TypeData)
    {
        if(!Node.Socket)
        {
            this.DeleteNodeFromActive(Node)
            return;
        }
        
        if(Info.Context)
        {
            Info.ContextID = Info.Context.ContextID
            if(!Info.ContextID)
            {
                Info.ContextID = crypto.randomBytes(32)
                Info.Context.ContextID = Info.ContextID
            }
            Info.Context.TimeMethodSend = GetCurrentTime(0) - 0
            global.ContextPackets.SaveValue(Info.ContextID, Info.Context)
        }
        else
        {
            Info.ContextID = []
        }
        
        Node.SendPacketNum++
        Info.Node = Node
        Info.TypeData = TypeData
        Info.Prioritet = Node.Prioritet
        Info.PacketNum = Node.SendPacketNum
        Info.TimeNum = Date.now()
        
        Node.SendPacket.insert(Info)
    }
    
    DoSendPacketNodeAll(Node)
    {
        while(this.DoSendPacketNode(Node) === 1);
    }
    
    DoSendPacketNode(Node)
    {
        var TimeNum = Date.now();
        var Info = Node.SendPacket.max();
        if(Info && TimeNum - Info.TimeNum > PACKET_ALIVE_PERIOD)
            while(Info = Node.SendPacket.max())
            {
                var DeltaTime = TimeNum - Info.TimeNum;
                if(DeltaTime > PACKET_ALIVE_PERIOD / 2)
                {
                    Node.SendPacket.remove(Info)
                    
                    ADD_TO_STAT("DELETE_OLD_PACKET")
                }
                else
                    break;
            }
        
        Info = Node.SendPacket.min()
        if(!Info)
            return 0;
        
        ADD_TO_STAT("MAX:NODE_BUF_WRITE:" + NodeName(Node), Node.BufWrite.length / 1024, 1)
        ADD_TO_STAT("MAX:NODE_SEND_BUF_PACKET_COUNT:" + NodeName(Node), Node.SendPacket.size, 1)
        
        if(Node.BufWrite.length > 2 * TRAFIC_LIMIT_1S)
        {
            return 2;
        }
        
        Node.SendPacket.remove(Info)
        
        if(Info.Context)
        {
            if(!Info.Context.SendCount)
                Info.Context.SendCount = 0
            Info.Context.SendCount++
        }
        var BufWrite = this.GetBufFromData(Info.Method, Info.Data, Info.TypeData, Info.ContextID);
        
        Node.BufWriteLength += BufWrite.length
        
        if(Node.BufWrite.length === 0)
            Node.BufWrite = BufWrite
        else
            Node.BufWrite = Buffer.concat([Node.BufWrite, BufWrite])
        
        ADD_TO_STAT("SEND:" + Info.Method)
        ADD_TO_STAT("SEND:(KB)" + Info.Method, BufWrite.length / 1024)
        
        ADD_TO_STAT("SEND:" + Info.Method + ":" + NodeName(Node), 1, 1)
        TO_DEBUG_LOG("SEND " + Info.Method + " to " + NodeInfo(Node) + " LENGTH=" + BufWrite.length)
        return 1;
    }
    
    DoSendPacket()
    {
        
        var it = this.ActualNodes.iterator(), Node;
        while((Node = it.next()) !== null)
            if(Node.ConnectStatus() === 100)
            {
                this.DoSendPacketNode(Node)
            }
            else
            {
                ADD_TO_STAT("SEND_ERROR")
                this.AddCheckErrCount(Node, 0.005, "NODE STATUS=" + Node.ConnectStatus())
            }
    }
    
    DoSendBuf()
    {
        this.RecalcSendStatictic()
        var CountNodeSend = 0;
        var it = this.ActualNodes.iterator(), Node;
        NEXT_NODE:
        while((Node = it.next()) !== null)
            if(Node.Socket && Node.ConnectStatus() === 100)
                if(Node.BufWrite.length > 0)
                {
                    CountNodeSend++
                    
                    var CountSend = Math.min(BUF_PACKET_SIZE, Node.BufWrite.length);
                    var Value = CountSend / 1024;
                    
                    if(global.LIMIT_SEND_TRAFIC)
                    {
                        var CanCountSend = Node.SendTrafficLimit - Node.SendTrafficCurrent;
                        if(CanCountSend < CountSend)
                        {
                            
                            if(this.SendTrafficFree < CountSend)
                            {
                                ADD_TO_STAT("LIMIT_SENDDATA:" + NodeName(Node), Value, 1)
                                continue NEXT_NODE;
                            }
                            
                            this.SendTrafficFree -= CountSend
                        }
                    }
                    
                    Node.write(Node.BufWrite.slice(0, CountSend))
                    
                    Node.SendTrafficCurrent += CountSend
                    Node.BufWrite = Node.BufWrite.slice(CountSend)
                    
                    this.ADD_CURRENT_STAT_TIME("SEND_DATA", Value)
                    ADD_TO_STAT("SENDDATA(KB)", Value)
                    ADD_TO_STAT("SENDDATA(KB):" + NodeName(Node), Value, 1)
                }
    }
    
    CheckPOWTicketConnect(Socket, data)
    {
        try
        {
            var Info = BufLib.GetObjectFromBuffer(data, FORMAT_POW_TO_SERVER, {});
        }
        catch(e)
        {
            this.SendCloseSocket(Socket, "FORMAT_POW_TO_SERVER")
            return;
        }
        
        if(Info.DEF_NETWORK !== GetNetworkName())
        {
            this.SendCloseSocket(Socket, "DEF_NETWORK=" + Info.DEF_NETWORK + " MUST:" + GetNetworkName())
            return;
        }
        
        if(CompareArr(Info.addrArr, this.addrArr) === 0)
        {
            AddNodeInfo(Node, "SERV: GET SELF")
            this.SendCloseSocket(Socket, "SELF")
            return;
        }
        
        if(Info.GrayConnect)
        {
            Info.FromIP = Socket.remoteAddress
            Info.FromPort = Socket.remotePort
        }
        
        var Node = this.FindRunNodeContext(Info.addrArr, Info.FromIP, Info.FromPort, true);
        if(!Node)
        {
            var StrDop = "";
            if(!this.IsCorrectNode(Info.FromIP, Info.FromPort))
                StrDop = " Not correct ip=" + Info.FromIP + ":" + Info.FromPort
            this.SendCloseSocket(Socket, "Error Node Context" + StrDop)
            return;
        }
        var Hash = shaarr2(this.addrArr, Socket.HashRND);
        var hashInfo = GetHashWithValues(Hash, Info.nonce, 0);
        var power = GetPowPower(hashInfo);
        
        if(Info.Reconnect)
        {
            
            if((Node.SecretForReconnect && Node.WaitConnectFromServer && CompareArr(Node.SecretForReconnect, Info.SecretForReconnect) === 0) || Info.Reconnect === 255)
            {
                var Result = 1;
                if(Info.Reconnect === 255)
                {
                    Result = CheckDevelopSign(Hash, Info.Sign)
                }
                
                if(Result)
                {
                    Node.NextConnectDelta = 1000
                    Node.WaitConnectFromServer = 0
                    Node.GrayConnect = 0
                    AddNodeInfo(Node, "3. SERVER OK CONNECT  for client node " + SocketInfo(Socket))
                    
                    this.AddNodeToActive(Node)
                    Node.Socket = Socket
                    SetSocketStatus(Socket, 3)
                    SetSocketStatus(Socket, 100)
                    Socket.Node = Node
                    
                    Socket.write(this.GetBufFromData("POW_CONNECT0", "OK", 2))
                    return;
                }
                else
                {
                    Node.NextConnectDelta = 60 * 1000
                    ToLog("Error Sign Node from " + NodeInfo(Node))
                    this.AddCheckErrCount(Node, 10, "Error Sign Node")
                }
            }
            AddNodeInfo(Node, "SERV: ERROR_RECONNECT")
            Socket.end(this.GetBufFromData("POW_CONNEC11", "ERROR_RECONNECT", 2))
            CloseSocket(Socket, "ERROR_RECONNECT")
            return;
        }
        else
        {
            if(power < MIN_POWER_POW_HANDSHAKE)
            {
                ToLog("END: MIN_POWER_POW_HANDSHAKE")
                AddNodeInfo(Node, "SERV: ERR MIN_POWER_POW_HANDSHAKE")
                Socket.end(this.GetBufFromData("POW_CONNECT2", "MIN_POWER_POW_HANDSHAKE", 2))
                CloseSocket(Socket, "MIN_POWER_POW_HANDSHAKE")
                return;
            }
            else
            {
                if(!Node.BlockProcessCount)
                    Node.BlockProcessCount = 0
                
                if(this.ActualNodes.size >= MAX_CONNECTIONS_COUNT && Node.BlockProcessCount < global.TRUST_PROCESS_COUNT)
                {
                    
                    AddNodeInfo(Node, "SERV: ERROR_MAX_CLIENTS")
                    Socket.end(this.GetBufFromData("POW_CONNECT8", "ERROR_MAX_CLIENTS", 2))
                    CloseSocket(Socket, "ERROR_MAX_CLIENTS")
                    return;
                }
                
                var Result = false;
                if(Info.PubKeyType === 2 || Info.PubKeyType === 3)
                    Result = secp256k1.verify(Buffer.from(Hash), Buffer.from(Info.Sign), Buffer.from([Info.PubKeyType].concat(Info.addrArr)))
                if(!Result)
                {
                    AddNodeInfo(Node, "SERV: ERROR_SIGN_CLIENT")
                    Socket.end(this.GetBufFromData("POW_CONNECT8", "ERROR_SIGN_CLIENT", 2))
                    CloseSocket(Socket, "ERROR_SIGN_CLIENT")
                    this.AddToBanIP(Socket.remoteAddress, "ERROR_SIGN_CLIENT")
                    return;
                }
                AddNodeInfo(Node, "1. SERVER OK POW for client node " + SocketInfo(Socket))
                
                Node.FromIP = Info.FromIP
                Node.FromPort = Info.FromPort
                Node.SecretForReconnect = crypto.randomBytes(20)
                Node.PubKey = Buffer.from([Info.PubKeyType].concat(Info.addrArr))
                if(Info.GrayConnect)
                {
                    Node.NextConnectDelta = 1000
                    Node.WaitConnectFromServer = 0
                    Node.GrayConnect = 1
                    AddNodeInfo(Node, "5. CLIENT OK GRAY CONNECT " + SocketInfo(Socket))
                    
                    this.AddNodeToActive(Node)
                    Node.Socket = Socket
                    SetSocketStatus(Socket, 3)
                    SetSocketStatus(Socket, 100)
                    Socket.Node = Node
                    
                    Socket.write(this.GetBufFromData("POW_CONNECT0", "OK", 2))
                    return;
                }
                
                if(!Node.WasAddToReconnect)
                {
                    Node.WasAddToReconnect = 1
                    Node.ReconnectFromServer = 1
                    global.ArrReconnect.push(Node)
                }
                Socket.write(this.GetBufFromData("POW_CONNECT4", "WAIT_CONNECT_FROM_SERVER:" + GetHexFromArr(Node.SecretForReconnect), 2))
            }
        }
    }
    
    StopServer()
    {
        if(this.Server)
            this.Server.close()
    }
    StartServer()
    {
        if(GrayConnect())
        {
            this.CanSend++
            return;
        }
        if(global.NET_WORK_MODE && NET_WORK_MODE.NOT_RUN)
        {
            return;
        }
        
        let SELF = this;
        
        this.Server = net.createServer(function (sock)
        {
            
            if(SELF.WasBanIP({address:sock.remoteAddress}))
            {
                sock.ConnectID = "new"
                CloseSocket(sock, "WAS BAN", true)
                return;
            }
            
            let SOCKET = sock;
            socketInit(SOCKET, "c")
            SetSocketStatus(SOCKET, 0)
            AddNodeInfo(SOCKET, "Client *" + SOCKET.ConnectID + " connected from " + SOCKET.remoteAddress + ":" + SOCKET.remotePort, 1)
            
            ADD_TO_STAT("ClientConnected")
            
            SOCKET.HashRND = crypto.randomBytes(32)
            var Data = {addrArr:SELF.addrArr, HashRND:SOCKET.HashRND, MIN_POWER_POW_HANDSHAKE:MIN_POWER_POW_HANDSHAKE, PubKeyType:SELF.PubKeyType,
                Sign:SELF.ServerSign, Reserve:[]};
            var BufData = BufLib.GetBufferFromObject(Data, FORMAT_POW_TO_CLIENT, 300, {});
            var BufWrite = SELF.GetBufFromData("POW_CONNECT5", BufData, 1);
            try
            {
                SOCKET.write(BufWrite)
            }
            catch(e)
            {
                ToError(e)
                SOCKET = undefined
                return;
            }
            
            SOCKET.on('data', function (data)
            {
                if(SOCKET.WasClose)
                {
                    return;
                }
                if(!SOCKET.Node)
                {
                    var Buf = SELF.GetDataFromBuf(data);
                    if(Buf)
                    {
                        SELF.CheckPOWTicketConnect(SOCKET, Buf.Data)
                        SOCKET.ConnectToServer = 0
                        return;
                    }
                    CloseSocket(SOCKET, "=SERVER ON DATA=")
                }
                else
                {
                    socketRead(SOCKET, data)
                    SELF.OnGetFromTCP(SOCKET.Node, SOCKET, data)
                }
            })
            
            SOCKET.on('end', function ()
            {
                ADD_TO_STAT("ClientEnd")
                
                var Node = SOCKET.Node;
                var Status = GetSocketStatus(SOCKET);
                if(Status)
                    AddNodeInfo(Node, "Get socket end *" + SOCKET.ConnectID + " from client Stat: " + SocketStatistic(SOCKET))
                
                if(Node && Status === 200)
                {
                    Node.SwapSockets()
                    SOCKET.WasClose = 1
                }
            })
            SOCKET.on('close', function (err)
            {
                ADD_TO_STAT("ClientClose")
                
                if(SOCKET.ConnectID && GetSocketStatus(SOCKET))
                    AddNodeInfo(SOCKET.Node, "Get socket close *" + SOCKET.ConnectID + " from client Stat: " + SocketStatistic(SOCKET))
                
                if(!SOCKET.WasClose && SOCKET.Node)
                {
                    CloseSocket(SOCKET, "GET CLOSE")
                }
                SetSocketStatus(SOCKET, 0)
            })
            SOCKET.on('error', function (err)
            {
                ADD_TO_STAT("ERRORS")
                CloseSocket(SOCKET, "ERRORS")
                
                if(SOCKET.Node)
                    SELF.AddCheckErrCount(SOCKET.Node, 1, "ERR##2 : socket")
            })
        })
        
        this.Server.on('close', function ()
        {
        })
        
        this.Server.on('error', function (err)
        {
            if(err.code === 'EADDRINUSE')
            {
                ToLogClient('Port ' + SELF.port + ' in use, retrying...')
                if(SELF.Server)
                    SELF.Server.close()
                setTimeout(function ()
                {
                    SELF.RunListenServer()
                }, 5000)
                return;
            }
            
            ADD_TO_STAT("ERRORS")
            ToError("ERR##3")
        })
        
        StartPortMapping(this.ip, this.port, function (ip)
        {
            if(!SELF.ip && ip)
            {
                SELF.ip = ip
                global.INTERNET_IP_FROM_STUN = ip
            }
            SELF.CanSend++
            SELF.RunListenServer()
        })
    }
    
    RunListenServer()
    {
        if(!START_PORT_NUMBER || START_PORT_NUMBER === "undefined")
        {
            START_PORT_NUMBER = STANDART_PORT_NUMBER
            ToLog("SET START_PORT_NUMBER = " + START_PORT_NUMBER)
        }
        
        let SELF = this;
        SELF.port = START_PORT_NUMBER
        ToLogClient("Prepare to run TCP server on " + LISTEN_IP + ":" + SELF.port)
        this.Server.listen(SELF.port, LISTEN_IP, function ()
        {
            if(SELF.CanSend < 2)
                ToLogClient("Run TCP server on " + SELF.ip + ":" + SELF.port)
            SELF.CanSend++
            var Hash;
            Hash = sha3(SELF.addrStr, 26)
            
            SELF.ServerSign = secp256k1.sign(Buffer.from(Hash), SELF.KeyPair.getPrivateKey('')).signature
        })
    }
    
    CLOSE_SOCKET(Context, CurTime)
    {
        AddNodeInfo(Context.Socket.Node, "GET CLOSE_SOCKET *" + Context.Socket.ConnectID + ": " + Context.Data.toString())
        CloseSocket(Context.Socket, "CLOSE_SOCKET")
    }
    
    SendCloseSocket(Socket, Str)
    {
        AddNodeInfo(Socket.Node, "CLOSE_SOCKET " + SocketInfo(Socket) + " - " + Str)
        if(Socket.WasClose)
        {
            return;
        }
        this.AddCheckErrCount(Socket.Node, 1, "SendCloseSocket")
        
        if(Socket.Node && Socket.Node.BufWrite && Socket.Node.BufWrite.length > 0)
        {
        }
        else
        {
            AddNodeInfo(Socket.Node, "END *" + Socket.ConnectID + ": " + Str)
            Socket.end(this.GetBufFromData("CLOSE_SOCKET", Str, 2))
        }
        CloseSocket(Socket, Str)
    }
    
    AddCheckErrCount(Node, Count, StrErr)
    {
        if(!Node)
            return;
        if(!Count)
            Count = 1
        
        var Delta = Date.now() - Node.LastTimeError;
        if(Delta > 10 * 1000)
        {
            Node.ErrCount = 0
        }
        Node.LastTimeError = Date.now()
        
        Node.ErrCountAll += Count
        Node.ErrCount += Count
        if(Node.ErrCount >= 5)
        {
            
            Node.ErrCount = 0
            ADD_TO_STAT("ERRORS")
            
            Node.BlockProcessCount--
            this.CheckBlockProcess(Node, StrErr)
        }
    }
    CheckBlockProcess(Node, StrErr)
    {
        if(Node.BlockProcessCount <  - 30)
        {
            if(!StrErr)
                StrErr = ""
            this.AddToBan(Node, StrErr + " BlockProcess:" + Node.BlockProcessCount)
        }
        else
        {
        }
    }
};

global.ContextPackets = new STreeBuffer(10 * 1000, CompareItemHash32, "object");

function CalcStatArr(arr,arrAvg,arrNext,Period)
{
    var arrSum = [arr[0]];
    for(var i = 1; i < arr.length; i++)
    {
        arrSum[i] = arrSum[i - 1] + arr[i];
    }
    
    for(var i = 0; i < arrSum.length; i++)
    {
        if(i < Period)
            arrAvg[i] = Math.floor(arrSum[i] / (i + 1));
        else
        {
            arrAvg[i] = Math.floor((arrSum[i] - arrSum[i - Period]) / Period);
        }
    }
    
    arrNext[0] = 0;
    for(var i = 1; i < arrAvg.length; i++)
    {
        var Avg = arrSum[i] / (i + 1);
        var minValue = Avg / 20;
        
        var Value1 = arrAvg[i - 1];
        var Value2 = arrAvg[i];
        if(Value1 < minValue)
            Value1 = minValue;
        if(Value2 < minValue)
            Value2 = minValue;
        
        var KLast = Math.floor(100 * (Value2 - Value1) / Value1) / 100;
        var AvgLast = arrAvg[i];
        if(Avg > AvgLast)
            AvgLast = Avg;
        
        if(KLast > 2.0)
            KLast = 2.0;
        if(KLast <  - 0.0)
            KLast =  - 0.0;
        
        arrNext[i] = AvgLast * (1 + KLast);
        
        var AvgMax = 0;
        if(0)
            if(i > 1 * Period)
            {
                for(var j = i - Period / 2; j <= i; j++)
                    if(arrAvg[j] > AvgMax)
                        AvgMax = arrAvg[j];
            }
    }
    
    return arrNext[arrNext.length - 1];
}
