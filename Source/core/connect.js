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

const crypto = require('crypto');
const CNode = require("./node");

global.PERIOD_FOR_RECONNECT = 3600 * 1000;

global.CHECK_DELTA_TIME = {Num:0, bUse:0, StartBlockNum:0, EndBlockNum:0, bAddTime:0, DeltaTime:0, Sign:[]};
global.CHECK_POINT = {BlockNum:0, Hash:[], Sign:[]};
global.CODE_VERSION = {BlockNum:0, addrArr:[], LevelUpdate:0, BlockPeriod:0, VersionNum:UPDATE_CODE_VERSION_NUM, Hash:[], Sign:[],
    StartLoadVersionNum:0};
global.NET_CONSTANT = {Num:0, BlockNum:0, MaxTrasactionLimit:MAX_TRANSACTION_LIMIT, ProtocolVer:global.PROTOCOL_VER, ProtocolMode:global.PROTOCOL_MODE,
    MaxLevel:global.MAX_LEVEL, Reserv1:[], Reserv2:0, Reserv3:0, Reserv4:0, Reserv5:0, Hash:[], Sign:[]};

const FORMAT_NET_CONSTANT = "Num:uint,BlockNum:uint,MaxTrasactionLimit:uint,ProtocolVer:byte,ProtocolMode:byte,MaxLevel:byte, Reserv1:arr3, Reserv2:uint,Reserv3:uint,Reserv4:uint,Reserv5:uint";

global.START_LOAD_CODE = {};

const MAX_PERIOD_GETNODES = 120 * 1000;
global.MIN_PERIOD_PING = 4 * 1000;
const MAX_PERIOD_PING = 120 * 1000;

global.MAX_PING_FOR_CONNECT = 400;

var MAX_TIME_CORRECT = 3 * 3600 * 1000;

global.MAX_WAIT_PERIOD_FOR_HOT = 4 * CONSENSUS_PERIOD_TIME;

const PERIOD_FOR_START_CHECK_TIME = 300;

module.exports = class CConnect extends require("./connect2")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        
        this.StartTime = Date.now()
        
        this.LevelNodes = []
        
        this.NodesArr = []
        this.NodesArrUnSort = []
        this.NodesMap = {}
        this.NodesIPPortMap = {}
        
        this.NodesTree = new RBTree(CompareNodeIPPort)
        
        this.PerioadAfterCanStart = 0
        
        this.КодДляРазработчикаХекс = GetHexFromArr(this.KeyPair.computeSecret(DEVELOP_PUB_KEY, null))
        
        this.DO_CONSTANT()
        
        if(!global.ADDRLIST_MODE && !this.VirtualMode)
        {
            
            setInterval(this.StartPingPong.bind(this), 1000)
            
            setInterval(this.DeleteBadConnectingByTimer.bind(this), MAX_WAIT_PERIOD_FOR_STATUS / 2)
            
            setInterval(this.StartCheckTransferTree.bind(this), 1000)
        }
        
        setInterval(this.NodesArrSort.bind(this), 30000)
    }
    DO_CONSTANT()
    {
        this.CommonKey = GetHexFromArr(WALLET.HashProtect(global.COMMON_KEY))
        
        this.KeyToNode = shaarr(global.COMMON_KEY)
        this.NameToNode = this.ValueToXOR("Name", "TERA:" + global.NODES_NAME)
    }
    
    StartConnectTry(Node)
    {
        var Delta = Date.now() - Node.StartTimeConnect;
        if(Delta >= Node.NextConnectDelta && this.IsCanConnect(Node))
        {
            if(!GetSocketStatus(Node.Socket))
            {
                Node.StartTimeConnect = Date.now()
                if(Delta < 60 * 1000)
                    Node.NextConnectDelta = Node.NextConnectDelta * 2
                else
                    Node.NextConnectDelta = Math.trunc(Node.NextConnectDelta * 1.2)
                
                Node.CreateConnect()
            }
        }
    }
    
    FindRunNodeContext(addrArr, ip, port, bUpdate)
    {
        
        var Node, addrStr;
        
        addrStr = GetHexFromAddres(addrArr)
        Node = this.NodesMap[addrStr]
        if(!Node)
        {
            if(!this.IsCorrectNode(ip, port))
                return undefined;
            
            var key = "" + ip + ":" + port;
            Node = this.NodesIPPortMap[key]
            if(!Node)
            {
                Node = this.GetNewNode(ip, port, addrStr)
                if(!Node)
                    return undefined;
            }
        }
        
        if(Node.addrStr !== addrStr)
        {
            delete this.NodesMap[Node.addrStr]
            this.NodesMap[addrStr] = Node
            Node.addrStrTemp = undefined
        }
        
        Node.addrArr = addrArr
        Node.addrStr = addrStr
        Node.ip = ip.trim()
        Node.port = port
        return Node;
    }
    CheckNodeMap(Node)
    {
        if(Node.addrStrTemp && Node.addrStrTemp !== Node.addrStr)
        {
            delete this.NodesMap[Node.addrStrTemp]
            
            var Node2 = this.NodesMap[Node.addrStr];
            if(Node2 && Node2 !== Node)
            {
                Node2.Delete = 1
                AddNodeInfo(Node2, "FIND DOUBLE!!")
                delete this.NodesMap[Node.addrStr]
            }
            
            this.NodesMap[Node.addrStr] = Node
            Node.addrStrTemp = undefined
        }
    }
    
    StartHandshake(Node)
    {
        return this.StartConnectTry(Node);
    }
    StartPingPong()
    {
        if(glStopNode)
            return;
        
        if(global.CAN_START)
            this.PerioadAfterCanStart++
        this.TimeDevCorrect()
        
        var arr = SERVER.GetActualNodes();
        for(var i = 0; i < arr.length; i++)
        {
            var Node = arr[i];
            if(this.IsCanConnect(Node) && !Node.IsAddrList)
            {
                if(Node.Hot)
                    Node.NextPing = MIN_PERIOD_PING
                if(Node.NextPing < MIN_PERIOD_PING)
                    Node.NextPing = MIN_PERIOD_PING
                
                if(GrayConnect())
                {
                    Node.NextPing = random(MIN_PERIOD_PING)
                }
                
                var Delta = Date.now() - Node.PingStart;
                if(Delta >= Node.NextPing)
                {
                    
                    Node.PingStart = Date.now()
                    Node.NextPing = Node.NextPing * 1.5
                    if(Node.NextPing > MAX_PERIOD_PING)
                        Node.NextPing = MAX_PERIOD_PING
                    
                    if(!Node.PingNumber)
                        Node.PingNumber = 0
                    Node.PingNumber++
                    
                    var Context = {"StartTime":GetCurrentTime(0), PingNumber:Node.PingNumber};
                    this.SendF(Node, {"Method":"PING", "Context":Context, "Data":this.GetPingData(Node)})
                    
                    if(Node.Hot && !Node.LoadHistoryMode)
                        this.CheckForBotNet(Node)
                }
            }
        }
    }
    
    GetPingData(Node)
    {
        var GrayAddres = 0;
        if(GrayConnect())
            GrayAddres = 1
        
        var BlockNumHash = Math.trunc((GetCurrentBlockNumByTime() - BLOCK_PROCESSING_LENGTH2) / PERIOD_ACCOUNT_HASH) * PERIOD_ACCOUNT_HASH;
        var AccountsHash = DApps.Accounts.GetHashOrUndefined(BlockNumHash);
        
        var CheckPointHashDB = [];
        if(CHECK_POINT.BlockNum && CHECK_POINT.BlockNum <= this.BlockNumDB)
        {
            var Block = this.ReadBlockHeaderFromMapDB(CHECK_POINT.BlockNum);
            if(Block)
            {
                CheckPointHashDB = Block.Hash
            }
        }
        var HashDB = [];
        if(this.BlockNumDB > 0)
        {
            var Block = this.ReadBlockHeaderFromMapDB(this.BlockNumDB);
            if(Block)
                HashDB = Block.Hash
        }
        
        var LevelCount = this.GetLevelEnum(Node);
        
        var StopGetBlock = global.STOPGETBLOCK;
        if(!StopGetBlock && this.BusyLevel)
        {
            if(Node.BlockProcessCount <= this.BusyLevel)
                StopGetBlock = 1
        }
        
        var СтатДанные = [];
        var DirectMAccount = 0;
        
        var VersionNum;
        if(!Node.SendVersionNum)
            VersionNum = random(MIN_CODE_VERSION_NUM)
        else
            VersionNum = CODE_VERSION.VersionNum
        Node.SendVersionNum = 1
        
        var Ret = {VERSIONMAX:DEF_VERSION, FIRST_TIME_BLOCK:0, PingVersion:3, GrayConnect:GrayAddres, Reserve2:0, AutoCorrectTime:AUTO_CORRECT_TIME,
            LevelCount:LevelCount, Time:(GetCurrentTime() - 0), BlockNumDB:this.BlockNumDB, LoadHistoryMode:this.LoadHistoryMode, CanStart:global.CAN_START,
            CheckPoint:CHECK_POINT, BlockNumDBMin:this.BlockNumDBMin, Reserv3:[], Key:this.KeyToNode, Name:this.NameToNode, TrafficFree:this.SendTrafficFree,
            AccountBlockNum:BlockNumHash, AccountsHash:AccountsHash, MemoryUsage:Math.trunc(process.memoryUsage().heapTotal / 1024 / 1024),
            CheckDeltaTime:CHECK_DELTA_TIME, CodeVersion:{BlockNum:CODE_VERSION.BlockNum, addrArr:CODE_VERSION.addrArr, LevelUpdate:CODE_VERSION.LevelUpdate,
                BlockPeriod:CODE_VERSION.BlockPeriod, VersionNum:VersionNum, Hash:CODE_VERSION.Hash, Sign:CODE_VERSION.Sign}, IsAddrList:global.ADDRLIST_MODE,
            CheckPointHashDB:CheckPointHashDB, PortWeb:HTTP_HOSTING_PORT, HashDB:HashDB, StopGetBlock:StopGetBlock, NetConstant:NET_CONSTANT,
            LevelsBit:this.GetBitsByLevel(), };
        
        return Ret;
    }
    
    static
    
    PING_F(bSend)
    {
        return "{\
            VERSIONMAX:str15,\
            PingVersion:byte,\
            GrayConnect:byte,\
            Reserve2:byte,\
            AutoCorrectTime:byte,\
            LevelCount:uint16,\
            Time:uint,\
            BlockNumDB:uint,\
            LoadHistoryMode:byte,\
            CanStart:byte,\
            CheckPoint:{BlockNum:uint,Hash:hash,Sign:arr64},\
            BlockNumDBMin:uint,\
            Reserv3:arr32,\
            Key:arr32,\
            Name:arr32,\
            TrafficFree:uint,\
            AccountBlockNum:uint,\
            AccountsHash:hash,\
            MemoryUsage:uint,\
            CheckDeltaTime:{Num:uint,bUse:byte,StartBlockNum:uint,EndBlockNum:uint,bAddTime:byte,DeltaTime:uint,Sign:arr64},\
            CodeVersion:{BlockNum:uint,addrArr:arr32,LevelUpdate:byte,BlockPeriod:uint,VersionNum:uint,Hash:hash,Sign:arr64},\
            IsAddrList:byte,\
            CheckPointHashDB:hash,\
            PortWeb:uint16,\
            HashDB:hash,\
            StopGetBlock:uint,\
            NetConstant:{" + FORMAT_NET_CONSTANT + ",Sign:arr64},\
            LevelsBit:uint32,\
            }";
    }
    
    static
    
    PONG_F(bSend)
    {
        return CConnect.PING_F(bSend);
    }
    
    PING(Info, CurTime)
    {
        this.DoPingData(Info, 1)
        
        this.SendF(Info.Node, {"Method":"PONG", "Context":Info.Context, "Data":this.GetPingData(Info.Node)})
    }
    
    DoPingData(Info, bCheckPoint)
    {
        var Node = Info.Node;
        var Data = this.DataFromF(Info);
        
        Node.VERSIONMAX = Data.VERSIONMAX
        
        var Name;
        if(Data.PingVersion >= 3 && global.COMMON_KEY && CompareArr(Data.Key, this.KeyToNode) === 0)
        {
            Name = this.ValueFromXOR(Node, "Name", Data.Name)
        }
        
        if(Name && Name.substr(0, 5) === "TERA:")
        {
            Node.Name = Name.substr(5)
            if(Node.BlockProcessCount < 7000000 + global.TRUST_PROCESS_COUNT)
                Node.BlockProcessCount = 7000000 + global.TRUST_PROCESS_COUNT
        }
        else
        {
            Node.Name = ""
        }
        
        Node.INFO = Data
        Node.INFO.WasPing = 1
        Node.LevelCount = Data.LevelCount
        Node.LoadHistoryMode = Data.LoadHistoryMode
        Node.BlockNumDB = Data.BlockNumDB
        Node.BlockNumDBMin = Data.BlockNumDBMin
        
        Node.LastTime = GetCurrentTime() - 0
        Node.NextConnectDelta = 1000
        Node.StopGetBlock = Data.StopGetBlock
        Node.portweb = Data.PortWeb
        Node.LevelsBit = Data.LevelsBit
        if(bCheckPoint)
        {
            this.CheckCheckPoint(Data, Info.Node)
            this.CheckCodeVersion(Data, Info.Node)
            this.CheckDeltaTime(Data, Info.Node)
        }
    }
    
    PONG(Info, CurTime)
    {
        var Data = this.DataFromF(Info);
        var Node = Info.Node;
        if(!Info.Context)
            return;
        if(!Info.Context.StartTime)
            return;
        if(Info.Context.PingNumber !== Node.PingNumber)
            return;
        
        this.DoPingData(Info, 0)
        
        var DeltaTime = GetCurrentTime(0) - Info.Context.StartTime;
        Node.DeltaTimeM = DeltaTime
        
        Node.SumDeltaTime += DeltaTime
        Node.CountDeltaTime++
        Node.DeltaTime = Math.trunc(Node.SumDeltaTime / Node.CountDeltaTime)
        if(!Node.DeltaTime)
            Node.DeltaTime = 1000
        
        if(DeltaTime)
        {
            Node.DeltaGlobTime = GetCurrentTime() - (Data.Time + DeltaTime / 2)
        }
        this.CheckCheckPoint(Data, Info.Node)
        
        if(!START_LOAD_CODE.StartLoadVersionNum)
            START_LOAD_CODE.StartLoadVersionNum = 0
        
        this.CheckNetConstant(Data, Info.Node)
        
        this.CheckCodeVersion(Data, Info.Node)
        
        if(!global.CAN_START)
        {
            if(DeltaTime > MAX_PING_FOR_CONNECT)
                ToLog("DeltaTime=" + DeltaTime + ">" + MAX_PING_FOR_CONNECT + " ms  -  " + NodeInfo(Node), 2)
        }
        
        var Times;
        if(DeltaTime <= MAX_PING_FOR_CONNECT)
        {
            Times = Node.Times
            if(!Times || Times.Count >= 10)
            {
                Times = {SumDelta:0, Count:0, AvgDelta:0, Arr:[]}
                Node.Times = Times
            }
            
            var Time1 = Data.Time;
            var Time2 = GetCurrentTime();
            var Delta2 =  - (Time2 - Time1 - DeltaTime / 2);
            
            Times.Arr.push(Delta2)
            Times.SumDelta += Delta2
            Times.Count++
            Times.AvgDelta = Times.SumDelta / Times.Count
            if(Times.Count >= 2)
            {
                Times.Arr.sort(function (a,b)
                {
                    return Math.abs(a) - Math.abs(b);
                })
                Node.AvgDelta = Times.Arr[0]
            }
            
            if(global.AUTO_CORRECT_TIME)
            {
                this.CorrectTime()
            }
        }
        else
        {
        }
        ADD_TO_STAT("MAX:PING_TIME", DeltaTime)
        
        if(!global.CAN_START)
            if(Times && Times.Count >= 1 && Times.AvgDelta <= 200)
            {
                ToLog("****************************************** CAN_START")
                global.CAN_START = true
            }
        
        this.CheckDeltaTime(Data, Info.Node)
    }
    
    CheckCheckPoint(Data, Node)
    {
        if(CREATE_ON_START)
            return;
        
        if(Data.CheckPoint.BlockNum && Data.CheckPoint.BlockNum > CHECK_POINT.BlockNum)
        {
            var SignArr = arr2(Data.CheckPoint.Hash, GetArrFromValue(Data.CheckPoint.BlockNum));
            if(CheckDevelopSign(SignArr, Data.CheckPoint.Sign))
            {
                global.CHECK_POINT = Data.CheckPoint
                this.ResetNextPingAllNode()
                
                if(Data.CheckPoint.BlockNum < this.BlockNumDBMin)
                    return;
                
                var Block = this.ReadBlockHeaderDB(CHECK_POINT.BlockNum);
                if(Block && CompareArr(Block.Hash, CHECK_POINT.Hash) !== 0)
                {
                    this.BlockNumDB = CHECK_POINT.BlockNum - 1
                    this.TruncateBlockDB(this.BlockNumDB)
                    this.StartSyncBlockchain(Node, 0, 1)
                }
            }
            else
            {
                Node.NextConnectDelta = 60 * 1000
                ToLog("Error Sign CheckPoint=" + Data.CheckPoint.BlockNum + " from " + NodeInfo(Node))
                this.AddCheckErrCount(Node, 10, "Error Sign CheckPoint")
            }
        }
    }
    CheckDeltaTime(Data, Node)
    {
        if(global.AUTO_CORRECT_TIME)
            if(global.CAN_START && !CREATE_ON_START)
            {
                if(Data.CheckDeltaTime.Num > CHECK_DELTA_TIME.Num)
                {
                    var SignArr = this.GetSignCheckDeltaTime(Data.CheckDeltaTime);
                    if(CheckDevelopSign(SignArr, Data.CheckDeltaTime.Sign))
                    {
                        global.CHECK_DELTA_TIME = Data.CheckDeltaTime
                    }
                    else
                    {
                        Node.NextConnectDelta = 60 * 1000
                        ToLog("Error Sign CheckDeltaTime Num=" + Data.CheckDeltaTime.Num + " from " + NodeInfo(Node))
                        this.AddCheckErrCount(Node, 10, "Error Sign CheckDeltaTime")
                    }
                }
            }
    }
    
    CheckNetConstant(Data, Node)
    {
        if(Data.NetConstant.Num > NET_CONSTANT.Num)
        {
            var SignArr = this.GetSignCheckNetConstant(Data.NetConstant);
            if(CheckDevelopSign(SignArr, Data.NetConstant.Sign))
            {
                global.NET_CONSTANT = Data.NetConstant
                
                var CurBlockNum = GetCurrentBlockNumByTime();
                var Delta = Data.NetConstant.BlockNum - CurBlockNum;
                if(Delta < 1)
                    Delta = 1
                
                this.ResetNextPingAllNode()
                ToLog("Get new NetConstant (wait " + Delta + " s) Num=" + Data.NetConstant.Num)
                
                if(this.idTimerSetConst)
                    clearTimeout(this.idTimerSetConst)
                let SELF = this;
                this.idTimerSetConst = setTimeout(function ()
                {
                    SELF.DoNetConst()
                    this.idTimerSetConst = 0
                }, Delta * 1000)
            }
            else
            {
                Node.NextConnectDelta = 60 * 1000
                ToLog("Error Sign CheckNetConstant Num=" + Data.NetConstant.Num + " from " + NodeInfo(Node))
                this.AddCheckErrCount(Node, 10, "Error Sign CheckNetConstant")
            }
        }
    }
    
    DoNetConst()
    {
        global.MAX_TRANSACTION_LIMIT = NET_CONSTANT.MaxTrasactionLimit
        
        global.PROTOCOL_VER = NET_CONSTANT.ProtocolVer
        global.PROTOCOL_MODE = NET_CONSTANT.ProtocolMode
        global.MAX_LEVEL = NET_CONSTANT.MaxLevel
        this.OnSetProtocolMode()
    }
    
    CheckCodeVersion(Data, Node)
    {
        var CodeVersion = Data.CodeVersion;
        Node.VersionNum = CodeVersion.VersionNum
        if(CodeVersion.VersionNum >= MIN_CODE_VERSION_NUM)
        {
            Node.VersionOK = true
        }
        else
        {
            Node.VersionOK = false
        }
        
        if(Node.VersionOK)
        {
            Node.CanHot = true
            
            if(CHECK_POINT.BlockNum && Data.CheckPoint.BlockNum)
                if(CHECK_POINT.BlockNum !== Data.CheckPoint.BlockNum || CompareArr(CHECK_POINT.Hash, Data.CheckPoint.Hash) !== 0)
                {
                    Node.CanHot = false
                    Node.NextConnectDelta = 60 * 1000
                }
        }
        else
        {
            Node.CanHot = false
            if(!Node.VersionOK)
            {
                Node.NextConnectDelta = 60 * 1000
            }
        }
        
        var bLoadVer = 0;
        if(CodeVersion.BlockNum && (CodeVersion.BlockNum <= GetCurrentBlockNumByTime() || CodeVersion.BlockPeriod === 0) && CodeVersion.BlockNum > CODE_VERSION.BlockNum && !IsZeroArr(CodeVersion.Hash) && (CodeVersion.VersionNum > CODE_VERSION.VersionNum && CodeVersion.VersionNum > START_LOAD_CODE.StartLoadVersionNum || CodeVersion.VersionNum === CODE_VERSION.VersionNum && IsZeroArr(CODE_VERSION.Hash)))
        {
            bLoadVer = 1
        }
        
        if(bLoadVer)
        {
            var Level = AddrLevelArrFromBegin(this.addrArr, CodeVersion.addrArr);
            if(CodeVersion.BlockPeriod)
            {
                var Delta = GetCurrentBlockNumByTime() - CodeVersion.BlockNum;
                Level += Delta / CodeVersion.BlockPeriod
            }
            
            if(Level >= CodeVersion.LevelUpdate)
            {
                var SignArr = arr2(CodeVersion.Hash, GetArrFromValue(CodeVersion.VersionNum));
                if(CheckDevelopSign(SignArr, CodeVersion.Sign))
                {
                    ToLog("Get new CodeVersion = " + CodeVersion.VersionNum + " HASH:" + GetHexFromArr(CodeVersion.Hash).substr(0, 20))
                    
                    if(CodeVersion.VersionNum > CODE_VERSION.VersionNum && CodeVersion.VersionNum > START_LOAD_CODE.StartLoadVersionNum)
                    {
                        this.StartLoadCode(Node, CodeVersion)
                    }
                    else
                    {
                        CODE_VERSION = CodeVersion
                    }
                }
                else
                {
                    ToLog("Error Sign CodeVersion=" + CodeVersion.VersionNum + " from " + NodeInfo(Node) + " HASH:" + GetHexFromArr(CodeVersion.Hash).substr(0,
                    20))
                    ToLog(JSON.stringify(CodeVersion))
                    this.AddCheckErrCount(Node, 10, "Error Sign CodeVersion")
                    Node.NextConnectDelta = 60 * 1000
                }
            }
        }
    }
    
    GetSignCheckNetConstant(Data)
    {
        var Buf = BufLib.GetBufferFromObject(Data, "{" + FORMAT_NET_CONSTANT + "}", 1000, {});
        return shaarr(Buf);
    }
    GetSignCheckDeltaTime(Data)
    {
        var Buf = BufLib.GetBufferFromObject(Data, "{Num:uint,bUse:byte,StartBlockNum:uint,EndBlockNum:uint,bAddTime:byte,DeltaTime:uint}",
        1000, {});
        return shaarr(Buf);
    }
    
    ResetNextPingAllNode()
    {
        var arr = SERVER.GetActualNodes();
        for(var i = 0; i < arr.length; i++)
        {
            var Node2 = arr[i];
            if(Node2 && Node2.NextPing > 5 * 1000)
                Node2.NextPing = 5 * 1000
        }
    }
    
    StartDisconnectHot(Node, StrError, bDeleteHot)
    {
        AddNodeInfo(Node, "DisconnectHot:" + StrError)
        if(Node.Active && Node.Hot)
        {
            AddNodeInfo(Node, "SEND DISCONNECTHOT")
            this.Send(Node, {"Method":"DISCONNECTHOT", "Context":{}, "Data":StrError}, STR_TYPE)
        }
        
        this.DeleteNodeFromHot(Node)
    }
    
    DISCONNECTHOT(Info, CurTime)
    {
        this.DeleteNodeFromHot(Info.Node)
        ADD_TO_STAT("DISCONNECTHOT")
        AddNodeInfo(Info.Node, "GET DISCONNECTHOT:" + Info.Data)
    }
    
    StartGetNodes(Node)
    {
        if(glStopNode)
            return;
        
        var Delta = Date.now() - Node.StartTimeGetNodes;
        
        if(Delta >= Node.NextGetNodesDelta)
        {
            Node.StartTimeGetNodes = Date.now()
            Node.NextGetNodesDelta = Math.min(Node.NextGetNodesDelta * 2, MAX_PERIOD_GETNODES)
            if(global.ADDRLIST_MODE)
                Node.NextGetNodesDelta = MAX_PERIOD_GETNODES
            
            this.Send(Node, {"Method":"GETNODES", "Context":{}, "Data":undefined})
        }
    }
    
    GETNODES(Info, CurTime)
    {
        this.SendF(Info.Node, {"Method":"RETGETNODES", "Context":Info.Context, "Data":{arr:this.GetDirectNodesArray(false, 0, 1), IsAddrList:global.ADDRLIST_MODE,
            }}, MAX_NODES_RETURN * 250 + 300)
    }
    
    static
    
    RETGETNODES_F()
    {
        return "{arr:[\
                        {\
                            addrArr:arr32,\
                            ip:str20,\
                            port:uint16,\
                            portweb:uint16,\
                            LastTime:uint,\
                            Reserv0:uint,\
                            LevelsBit:uint32,\
                            Reserv:arr4\
                        }\
                    ],\
                    IsAddrList:byte}";
    }
    
    RETGETNODES(Info, CurTime)
    {
        var Data = this.DataFromF(Info);
        var arr = Data.arr;
        if(arr && arr.length > 0)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var elem = arr[i];
                if(this.IsCorrectNode(elem.ip, elem.port))
                {
                    elem.addrStr = GetHexFromArr(elem.addrArr)
                    
                    var Item = this.AddToArrNodes(elem, true);
                    if(Item)
                    {
                        Item.LastTimeGetNode = CurTime - 0
                    }
                }
            }
        }
        Info.Node.IsAddrList = Data.IsAddrList
        AddNodeInfo(Info.Node, "RETGETNODES length=" + arr.length)
    }
    
    GetNewNode(ip, port, addrStr)
    {
        var bTemp;
        if(!addrStr)
        {
            bTemp = 1
            addrStr = GetHexFromAddres(crypto.randomBytes(32))
        }
        var Node = new CNode(addrStr, ip, port);
        this.AddToArrNodes(Node, false)
        
        if(bTemp)
            Node.addrStrTemp = addrStr
        
        return Node;
    }
    AddNode(Str)
    {
        var ip, port;
        var Index = Str.indexOf(":");
        if(Index > 0)
        {
            ip = Str.substr(0, Index)
            port = ParseNum(Str.substr(Index + 1))
        }
        else
        {
            ip = Str
            port = STANDART_PORT_NUMBER
            if(global.TEST_NETWORK || global.LOCAL_RUN)
            {
            }
            else
            {
                ToLog("AddNode port = " + port)
            }
        }
        var Item = this.GetNewNode(ip, port);
        if(Item)
            return "AddNode " + ip + ":" + port;
        else
            return undefined;
    }
    
    IsCanConnect(Node)
    {
        if(Node.addrStr === this.addrStr || this.NodeInBan(Node) || Node.Delete || Node.Self || Node.DoubleConnection)
            return false;
        
        if(Node.ip === this.ip && Node.port === this.port)
            return false;
        
        if(this.addrStr === Node.addrStr)
            return false;
        
        return true;
    }
    
    IsCorrectNode(ip, port)
    {
        var Arr = ip.match(/[\w\.]/g);
        if(!Arr || !ip || Arr.length !== ip.length)
        {
            ToLog("Not correct ip addres: " + ip, 3)
            return 0;
        }
        
        if(global.UNIQUE_IP_MODE)
        {
            var CountPorts = this.GetCountPortsByIP(ip);
            if(CountPorts >= global.UNIQUE_IP_MODE)
            {
                ToLog("Not unique ip addres: " + ip, 3)
                return 0;
            }
        }
        return 1;
    }
    
    GetCountPortsByIP(ip)
    {
        var Count = 0;
        var find = {ip:ip, port:65535};
        var it = this.NodesTree.lowerBound(find);
        while(it)
        {
            it.prev()
            var item = it.data();
            if(!item || item.ip !== ip)
                break;
            
            Count++
        }
        
        return Count;
    }
    
    GetDirectNodesArray(bAll, bWebPort, bGetAddrArr)
    {
        var ret = [];
        var Value = {addrStr:this.addrStr, ip:this.ip, port:this.port, LastTime:0, DeltaTime:0, Hot:true, BlockProcessCount:0, portweb:HTTP_HOSTING_PORT,
            LevelsBit:this.GetBitsByLevel(), };
        if(bGetAddrArr)
            Value.addrArr = GetArrFromHex(Value.addrStr)
        ret.push(Value)
        
        var len = this.NodesArr.length;
        var UseRandom = 0;
        var MaxDeltaTime = 24 * 3600 * 1000;
        if(len > MAX_NODES_RETURN && !bAll)
        {
            UseRandom = 1
            MaxDeltaTime = NODES_DELTA_CALC_HOUR * 3600 * 1000
            len = MAX_NODES_RETURN
        }
        var mapWasAdd = {};
        
        var CurTime = GetCurrentTime();
        for(var i = 0; i < len; i++)
        {
            var Item;
            if(UseRandom)
            {
                Item = this.NodesArr[random(this.NodesArr.length)]
                if(mapWasAdd[Item.addrStr])
                {
                    continue;
                }
                mapWasAdd[Item.addrStr] = 1
            }
            else
            {
                Item = this.NodesArr[i]
            }
            if(bWebPort && !Item.portweb)
                continue;
            
            if(!this.IsCanConnect(Item, 1))
                continue;
            if(Item.GrayConnect)
                continue;
            
            if(Item.BlockProcessCount < 0)
                continue;
            
            if(!GrayConnect() && Item.LastTime - 0 < CurTime - MaxDeltaTime)
                continue;
            
            var Value = {addrStr:Item.addrStr, ip:Item.ip, port:Item.port, FirstTime:Item.FirstTime, FirstTimeStr:Item.FirstTimeStr, LastTime:Item.LastTime - 0,
                DeltaTime:Item.DeltaTime, Hot:Item.Hot, BlockProcessCount:Item.BlockProcessCount, Name:Item.Name, portweb:Item.portweb, LevelsBit:Item.LevelsBit,
            };
            if(bGetAddrArr)
                Value.addrArr = GetArrFromHex(Value.addrStr)
            
            ret.push(Value)
        }
        
        return ret;
    }
    
    AddToArrNodes(Item)
    {
        if(Item.addrStr === "" || Item.addrStr === this.addrStr)
            return;
        var Node;
        var key = Item.ip + ":" + Item.port;
        Node = this.NodesMap[Item.addrStr]
        if(!Node)
        {
            Node = this.NodesIPPortMap[key]
        }
        
        if(!Node)
        {
            
            if(Item instanceof CNode)
                Node = Item
            else
                Node = new CNode(Item.addrStr, Item.ip, Item.port)
            Node.id = 1 + this.NodesArr.length
            Node.addrArr = GetAddresFromHex(Node.addrStr)
            
            this.NodesMap[Node.addrStr] = Node
            this.NodesArr.push(Node)
            this.NodesArrUnSort.push(Node)
            
            this.NodesTree.insert(Node)
            
            ADD_TO_STAT("AddToNodes")
        }
        
        this.NodesMap[Node.addrStr] = Node
        this.NodesIPPortMap[key] = Node
        
        if(Node.addrArr && CompareArr(Node.addrArr, this.addrArr) === 0)
        {
            Node.Self = true
        }
        
        if(Item.BlockProcessCount)
            Node.BlockProcessCount = Item.BlockProcessCount
        if(Item.FirstTime)
        {
            Node.FirstTime = Item.FirstTime
            Node.FirstTimeStr = Item.FirstTimeStr
        }
        if(Item.Name)
            Node.Name = Item.Name
        if(Item.portweb)
            Node.portweb = Item.portweb
        
        if(Node.LastTime < Item.LastTime && Item.LastTime <= GetCurrentTime() - 0)
            Node.LevelsBit = Item.LevelsBit
        
        return Node;
    }
    
    NodesArrSort()
    {
        PrepareBlockProcessSort(this.NodesArr)
        this.NodesArr.sort(SortNodeBlockProcessCount)
        
        if((GrayConnect() || !this.LoadHistoryMode) && Date.now() - this.StartTime > 120 * 1000)
        {
            var arr0 = this.GetDirectNodesArray(true);
            var arr = arr0.slice(1, 2000);
            SaveParams(GetDataPath("nodes.lst"), arr)
        }
    }
    
    LoadNodesFromFile()
    {
        var arr = LoadParams(GetDataPath("nodes.lst"), []);
        PrepareBlockProcessSort(arr)
        arr.sort(SortNodeBlockProcessCount)
        
        for(var i = 0; i < arr.length; i++)
        {
            var elem = arr[i];
            if(this.IsCorrectNode(elem.ip, elem.port))
            {
                if(elem.LastTime)
                {
                    if(typeof elem.LastTime === "string")
                        elem.LastTime = 0
                }
                elem.LevelsBit = 0
                this.AddToArrNodes(elem, true)
            }
        }
    }
    
    GetLevelEnum(Node)
    {
        var Level = this.AddrLevelNode(Node);
        var arr0 = this.LevelNodes[Level];
        if(!arr0)
        {
            Node.LevelEnum = 1
            return 1;
        }
        
        var arr = [].concat(arr0);
        var bWas = 0;
        for(var n = 0; n < arr.length; n++)
        {
            if(arr[n] === Node)
            {
                bWas = 1
                break;
            }
        }
        
        if(!bWas)
            arr.push(Node)
        PrepareBlockProcessSort(arr)
        arr.sort(SortNodeBlockProcessCount)
        
        for(var n = 0; n < arr.length; n++)
        {
            if(arr[n] === Node)
            {
                Node.LevelEnum = 1 + n
                break;
            }
        }
        return Node.LevelEnum;
    }
    
    StartAddLevelConnect(Node)
    {
        if(!global.CAN_START)
            return;
        
        ADD_TO_STAT("NETCONFIGURATION")
        
        if(Node.Active && Node.CanHot)
            this.SendF(Node, {"Method":"ADDLEVELCONNECT", "Context":{}, "Data":this.GetLevelEnum(Node)})
    }
    
    static
    
    ADDLEVELCONNECT_F()
    {
        return "uint";
    }
    
    ADDLEVELCONNECT(Info, CurTime)
    {
        Info.Node.LevelCount = this.DataFromF(Info)
        
        var ret;
        var Count;
        if(!global.CAN_START)
            return;
        if(Info.Node.GrayConnect || GrayConnect())
            return;
        
        var Count = this.GetLevelEnum(Info.Node);
        
        var bAdd = this.AddLevelConnect(Info.Node);
        if(bAdd)
        {
            ret = {result:1, Count:Count}
        }
        else
        {
            ret = {result:0, Count:Count}
        }
        
        AddNodeInfo(Info.Node, "GET ADDLEVELCONNECT, DO bAdd=" + bAdd)
        
        this.SendF(Info.Node, {"Method":"RETADDLEVELCONNECT", "Context":Info.Context, "Data":ret})
    }
    
    AddLevelConnect(Node)
    {
        if(!global.CAN_START)
            return false;
        
        var Level = this.AddrLevelNode(Node);
        Node.Hot = true
        var arr = this.LevelNodes[Level];
        if(!arr)
        {
            arr = []
            this.LevelNodes[Level] = arr
        }
        var bWas = 0;
        for(var i = 0; i < arr.length; i++)
            if(arr[i] === Node)
            {
                bWas = 1
            }
        if(!bWas)
            arr.push(Node)
        
        Node.TransferCount = 0
        if(this.LoadHistoryMode)
            Node.LastTimeTransfer = (GetCurrentTime() - 0) + 30 * 1000
        else
            Node.LastTimeTransfer = (GetCurrentTime() - 0) + 10 * 1000
        Node.CanHot = true
        this.CheckDisconnectHot(Level)
        if(!Node.CanHot)
            return false;
        
        this.SendGetMessage(Node)
        ADD_TO_STAT("NETCONFIGURATION")
        ADD_TO_STAT("AddLevelConnect")
        AddNodeInfo(Node, "Add Level connect")
        
        return true;
    }
    
    static
    
    RETADDLEVELCONNECT_F()
    {
        return "{result:byte,Count:uint}";
    }
    
    RETADDLEVELCONNECT(Info, CurTime)
    {
        var Data = this.DataFromF(Info);
        
        AddNodeInfo(Info.Node, "GET RETADDLEVELCONNECT: " + Data.result)
        
        if(Data.result === 1)
        {
            this.AddLevelConnect(Info.Node)
        }
        else
        {
            this.AddCheckErrCount(Info.Node, 1)
        }
        
        Info.Node.LevelCount = Data.Count
    }
    
    DeleteBadConnectingByTimer()
    {
        
        if(glStopNode)
            return;
        
        var CurTime = GetCurrentTime();
        
        var arr = SERVER.NodesArr;
        for(var i = 0; i < arr.length; i++)
        {
            var Node = arr[i];
            var Status = GetSocketStatus(Node.Socket);
            
            if(Node.Active && Status < 100)
            {
                var Delta = CurTime - Node.LastTime;
                if(Delta > MAX_WAIT_PERIOD_FOR_STATUS)
                {
                    
                    AddNodeInfo(Node, "Close bad connecting by time")
                    this.DeleteNodeFromActive(Node)
                }
            }
        }
    }
    CheckDisconnectHot(Level)
    {
        var CurTime = GetCurrentTime() - 0;
        
        var MaxCountChilds = this.GetMaxConnectChilds();
        if(Level < 3 && MaxCountChilds > 4)
            MaxCountChilds = 4
        var arr = this.LevelNodes[Level];
        if(arr)
        {
            for(var n = arr.length - 1; n >= 0; n--)
            {
                var Node = arr[n];
                if(Node)
                {
                    var DeltaTime = CurTime - Node.LastTimeTransfer;
                    if(!Node.Hot || DeltaTime > MAX_WAIT_PERIOD_FOR_HOT)
                    {
                        this.StartDisconnectHot(Node, "TimeDisconnectHot")
                    }
                }
            }
            
            PrepareBlockProcessSort(arr)
            arr.sort(SortNodeBlockProcessCount)
            var ChildCount = arr.length;
            for(var n = arr.length - 1; n >= MIN_CONNECT_CHILD; n--)
            {
                var Node = arr[n];
                if(Node)
                {
                    
                    if(ChildCount > MaxCountChilds)
                    {
                        ChildCount--
                        Node.CanHot = false
                        this.StartDisconnectHot(Node, "MAX_CONNECT_CHILD")
                        ADD_TO_STAT("DisconnectChild")
                        continue;
                    }
                    if(ChildCount > (MIN_CONNECT_CHILD) && Node.LevelCount > MIN_CONNECT_CHILD)
                    {
                        ChildCount--
                        Node.CanHot = false
                        this.AddCheckErrCount(Node, 1)
                        this.StartDisconnectHot(Node, "MIN_CONNECT_CHILD:" + Node.LevelCount + " LevelEnum:" + (n + 1))
                        ADD_TO_STAT("DisconnectChild")
                        continue;
                    }
                }
            }
        }
    }
    SetTime(NewTime)
    {
        ToLog("Set new time: " + NewTime)
        if(NewTime)
        {
            global.DELTA_CURRENT_TIME = NewTime - (GetCurrentTime(0) - 0)
            SAVE_CONST(true)
        }
    }
    static
    TIME_F()
    {
        return "{Time:uint, Sign:arr64}";
    }
    SendTimeDev(Node)
    {
        if(!WALLET.WalletOpen)
        {
            ToLog("Error Wallet not open")
            return 0;
        }
        
        if(!this.SignCurrentTimeDev)
        {
            var SignArr = GetArrFromHex(SERVER.addrStr);
            this.SignCurrentTimeDev = secp256k1.sign(SHA3BUF(SignArr), WALLET.KeyPair.getPrivateKey('')).signature
        }
        var Time = GetCurrentTime() - 0;
        ToLog("Send time: " + Time + " to " + NodeInfo(Node))
        this.SendF(Node, {"Method":"TIME", "Data":{Time:Time, Sign:this.SignCurrentTimeDev}})
        return 1;
    }
    SendTimeToAll()
    {
        var Count = 0;
        for(var i = 0; i < this.NodesArr.length; i++)
        {
            var Node = this.NodesArr[i];
            if(Node.Active)
            {
                if(this.SendTimeDev(Node))
                    Count++
            }
        }
        return Count;
    }
    
    TIME(Info, CurTime)
    {
        if(global.AUTO_CORRECT_TIME)
        {
            var Node = Info.Node;
            var Data = this.DataFromF(Info);
            var SignArr = GetArrFromHex(Node.addrStr);
            if(CheckDevelopSign(SignArr, Data.Sign))
            {
                this.SetTime(Data.Time)
            }
            else
            {
                Node.NextConnectDelta = 60 * 1000
                ToLog("Error Sign TIME from " + NodeInfo(Node))
                this.AddCheckErrCount(Node, 10, "Error Sign TIME")
            }
        }
    }
    
    AddToConnect(Node)
    {
        AddNodeInfo(Node, "To connect")
        Node.WasAddToConnect = 1
        ArrConnect.push(Node)
    }
    
    ConnectToAll()
    {
        var Count = 0;
        for(var i = 0; i < this.NodesArr.length; i++)
        {
            var Node = this.NodesArr[i];
            if(!Node.Active && this.IsCanConnect(Node) && !Node.WasAddToConnect)
            {
                Node.NextConnectDelta = 1000
                this.AddToConnect(Node)
                Count++
            }
        }
        return Count;
    }
    DisconnectAll()
    {
        var Count = 0;
        for(var i = 0; i < this.NodesArr.length; i++)
        {
            var Node = this.NodesArr[i];
            if(Node.Active)
            {
                AddNodeInfo(Node, "Disconnect hot all")
                Node.NextConnectDelta = 10000
                this.DeleteNodeFromActive(Node)
                Count++
            }
        }
        return Count;
    }
    
    GetHotTimeNodes()
    {
        if(this.LoadHistoryMode || !global.CAN_START)
            return this.GetActualNodes();
        else
            return this.GetHotNodes();
    }
    
    CorrectTime()
    {
        var MaxCorrect = MAX_TIME_CORRECT;
        var PerioadAfterCanStart = this.PerioadAfterCanStart;
        var ArrNodes = this.GetHotTimeNodes();
        var CountNodes = ArrNodes.length;
        var DeltaArr = [];
        var NodesSet = new Set();
        for(var i = 0; i < ArrNodes.length; i++)
        {
            var Node = ArrNodes[i];
            if(!Node.Times)
                continue;
            if(Node.Times.Count < 2)
                continue;
            
            if(PerioadAfterCanStart >= PERIOD_FOR_START_CHECK_TIME)
                if(Node.Times.Count < 5)
                    continue;
            
            NodesSet.add(Node)
        }
        
        for(var Node of NodesSet)
        {
            DeltaArr.push(Node.Times.AvgDelta)
        }
        
        if(DeltaArr.length < 1)
            return;
        if(this.LoadHistoryMode && CountNodes > 10)
        {
            PerioadAfterCanStart = 0
            CountNodes = 10
        }
        
        if(DeltaArr.length < CountNodes / 2)
            return;
        if(PerioadAfterCanStart >= PERIOD_FOR_START_CHECK_TIME)
        {
            if(DeltaArr.length < 3 * CountNodes / 4)
                return;
        }
        
        DeltaArr.sort(function (a,b)
        {
            return a - b;
        })
        var start, finish;
        if(Math.floor(DeltaArr.length / 2) === DeltaArr.length / 2)
        {
            start = DeltaArr.length / 2 - 1
            finish = start + 1
        }
        else
        {
            start = Math.floor(DeltaArr.length / 2)
            finish = start
        }
        
        var Sum = 0;
        var Count = 0;
        for(var i = start; i <= finish; i++)
        {
            Sum = Sum + DeltaArr[i]
            Count++
        }
        
        var AvgDelta = Sum / Count;
        
        if(PerioadAfterCanStart < PERIOD_FOR_START_CHECK_TIME)
        {
            var KT = (PERIOD_FOR_START_CHECK_TIME - PerioadAfterCanStart) / PERIOD_FOR_START_CHECK_TIME;
            AvgDelta = AvgDelta * KT
        }
        else
        {
            MaxCorrect = 25
        }
        
        if(AvgDelta < ( - MaxCorrect))
            AvgDelta =  - MaxCorrect
        else
            if(AvgDelta > MaxCorrect)
                AvgDelta = MaxCorrect
        
        AvgDelta = Math.trunc(AvgDelta)
        if(Math.abs(AvgDelta) < 15)
        {
            return;
        }
        if(AvgDelta > 0)
            ADD_TO_STAT("CORRECT_TIME_UP", AvgDelta)
        else
            ADD_TO_STAT("CORRECT_TIME_DOWN",  - AvgDelta)
        
        global.DELTA_CURRENT_TIME = Math.trunc(global.DELTA_CURRENT_TIME + AvgDelta)
        this.ClearTimeStat()
        
        SAVE_CONST()
    }
    ClearTimeStat()
    {
        var ArrNodes = this.GetHotTimeNodes();
        for(var Node of ArrNodes)
        {
            Node.Times = undefined
        }
    }
    
    TimeDevCorrect()
    {
        if(CHECK_DELTA_TIME.bUse)
        {
            var BlockNum = GetCurrentBlockNumByTime();
            if(CHECK_DELTA_TIME.StartBlockNum <= BlockNum && CHECK_DELTA_TIME.EndBlockNum > BlockNum)
            {
                if(!global.DELTA_CURRENT_TIME)
                    global.DELTA_CURRENT_TIME = 0
                var CorrectTime = 0;
                if(CHECK_DELTA_TIME.bAddTime)
                    CorrectTime = CHECK_DELTA_TIME.DeltaTime
                else
                    CorrectTime =  - CHECK_DELTA_TIME.DeltaTime
                
                global.DELTA_CURRENT_TIME += CorrectTime
                this.ClearTimeStat()
                SAVE_CONST(true)
            }
        }
    }
    
    SetNodePrioritet(Node, Prioritet)
    {
        if(Node.Prioritet === Prioritet)
            return;
        
        if(Node.addrArr)
        {
            var Item = this.ActualNodes.find(Node);
            if(Item)
            {
                this.ActualNodes.remove(Node)
                Node.Prioritet = Prioritet
                this.ActualNodes.insert(Node)
            }
        }
        Node.Prioritet = Prioritet
    }
    
    AddNodeToActive(Node)
    {
        
        if(Node.addrArr)
        {
            if(CompareArr(Node.addrArr, this.addrArr) === 0)
            {
                return;
            }
            
            this.CheckNodeMap(Node)
            
            this.ActualNodes.insert(Node)
        }
        
        Node.ResetNode()
        Node.Active = true
        Node.NextConnectDelta = 1000
        
        if(!Node.FirstTime)
        {
            Node.FirstTime = GetCurrentTime() - 0
            Node.FirstTimeStr = "" + GetStrTimeUTC()
        }
        
        ADD_TO_STAT("AddToActive")
    }
    
    DeleteNodeFromActive(Node)
    {
        Node.Active = false
        if(Node.Hot)
            this.StartDisconnectHot(Node, "NotActive", 1)
        Node.Hot = false
        
        this.ActualNodes.remove(Node)
        
        CloseSocket(Node.Socket, "DeleteNodeFromActive")
        CloseSocket(Node.Socket2, "DeleteNodeFromActive")
        Node.ResetNode()
        Node.Socket = undefined
        Node.Socket2 = undefined
    }
    
    StartReconnect()
    {
        return;
        
        var arr = this.GetActualNodes();
        for(var i = 0; i < arr.length; i++)
        {
            var Node = arr[i];
            if(Node.Socket && Node.Socket.ConnectToServer)
            {
                if(!Node.SocketStart)
                    Node.SocketStart = Date.now()
                var DeltaTime = Date.now() - Node.SocketStart;
                if(DeltaTime >= PERIOD_FOR_RECONNECT)
                {
                    if(random(100) >= 90)
                        Node.CreateReconnection()
                }
            }
        }
    }
    
    IsLocalIP(addr)
    {
        if(addr.substr(0, 7) === "192.168" || addr.substr(0, 3) === "10.")
            return 1;
        else
            return 0;
    }
    
    GetActualsServerIP(bFlag)
    {
        var arr = this.GetActualNodes();
        var Str = "";
        arr.sort(function (a,b)
        {
            if(a.ip > b.ip)
                return  - 1;
            else
                if(a.ip < b.ip)
                    return 1;
                else
                    return 0;
        })
        
        if(bFlag)
            return arr;
        
        for(var i = 0; i < arr.length; i++)
        {
            Str += arr[i].ip + ", "
        }
        return Str.substr(0, Str.length - 2);
    }
    AddrLevelNode(Node)
    {
        if(Node.GrayConnect)
            return MAX_LEVEL_SPECIALIZATION - 1;
        
        return AddrLevelArr(this.addrArr, Node.addrArr);
    }
    
    GetNodesLevelCount()
    {
        var Count = 0;
        for(var i = 0; i < this.LevelNodes.length; i++)
        {
            var arr = this.LevelNodes[i];
            for(var n = 0; arr && n < arr.length; n++)
                if(arr[n].Hot)
                {
                    Count++
                    break;
                }
        }
        return Count;
    }
    
    GetHotNodes()
    {
        var ArrNodes = [];
        for(var L = 0; L < this.LevelNodes.length; L++)
        {
            var arr = this.LevelNodes[L];
            for(let j = 0; arr && j < arr.length; j++)
            {
                ArrNodes.push(arr[j])
            }
        }
        return ArrNodes;
    }
    
    DeleteNodeFromHot(Node)
    {
        if(Node.Hot)
        {
            Node.Hot = false
        }
        Node.CanHot = false
        for(var i = 0; i < this.LevelNodes.length; i++)
        {
            var arr = this.LevelNodes[i];
            for(var n = 0; arr && n < arr.length; n++)
                if(arr[n] === Node)
                {
                    arr.splice(n, 1)
                    
                    ADD_TO_STAT("DeleteLevelConnect")
                    ADD_TO_STAT("NETCONFIGURATION")
                    break;
                }
        }
    }
    
    DeleteAllNodesFromHot(Str)
    {
        for(var i = 0; i < this.LevelNodes.length; i++)
        {
            var arr = this.LevelNodes[i];
            for(var n = 0; arr && n < arr.length; n++)
            {
                var Node = arr[n];
                if(Node.Hot)
                {
                    ADD_TO_STAT("DeleteAllNodesFromHot")
                    this.StartDisconnectHot(Node, Str, 1)
                }
            }
        }
    }
    GetTransferTree()
    {
        var HotArr = [];
        for(var Level = 0; Level < this.LevelNodes.length; Level++)
        {
            var arr = this.LevelNodes[Level];
            HotArr[Level] = []
            for(var n = 0; arr && n < arr.length; n++)
            {
                var Node = arr[n];
                if(Node)
                {
                    Node.Hot = 1
                    Node.Level = Level
                    HotArr[Level].push(Node)
                }
            }
        }
        var arr = this.NodesArr;
        for(var n = 0; arr && n < arr.length; n++)
        {
            var Node = arr[n];
            if(!Node)
                continue;
            if(Node.Hot)
                continue;
            if(!this.IsCanConnect(Node))
                continue;
            
            Node.Level = this.AddrLevelNode(Node)
            if(!HotArr[Node.Level])
                HotArr[Node.Level] = []
            
            HotArr[Node.Level].push(Node)
        }
        
        return HotArr;
    }
    
    DetectGrayMode()
    {
        if(global.NET_WORK_MODE)
            return;
        
        var CurTime = Date.now();
        
        var CountNodes = this.ActualNodes.size;
        if(CountNodes || this.StopDetectGrayMode)
        {
            this.SetDirectMode()
            this.StopDetectGrayMode = 1
            return;
        }
        
        if(!this.LastNotZeroNodesTime)
            this.LastNotZeroNodesTime = CurTime
        var DeltaTime = CurTime - this.LastNotZeroNodesTime;
        if(DeltaTime > 60 * 1000)
        {
            ToLog("DETECT GRAY MODE")
            if(!global.NET_WORK_MODE)
            {
                global.NET_WORK_MODE = {ip:"", port:global.START_PORT_NUMBER}
            }
            global.NET_WORK_MODE.UseDirectIP = 0
            SAVE_CONST()
        }
    }
    SetDirectMode()
    {
        ToLog("SETDIRECTMODE")
        var CountNodes = this.ActualNodes.size;
        if(CountNodes && !global.NET_WORK_MODE)
        {
            if(global.LOCAL_RUN)
            {
                global.NET_WORK_MODE = {ip:global.LISTEN_IP, port:global.START_PORT_NUMBER, NOT_RUN:0}
            }
            else
            {
                global.NET_WORK_MODE = {ip:"", port:global.START_PORT_NUMBER, NOT_RUN:0}
            }
            global.NET_WORK_MODE.UseDirectIP = 1
            SAVE_CONST()
        }
    }
    StartCheckTransferTree()
    {
        var ArrTree = this.GetTransferTree();
        this.TransferTree = ArrTree
        var CurTime = Date.now();
        
        if(GrayConnect())
        {
            var MustCount = GetGrayServerConnections();
            if(this.ActualNodes.size < MustCount)
            {
                PrepareBlockProcessSort(this.NodesArr)
                this.NodesArr.sort(SortNodeBlockProcessCountGray)
                
                var WasDoConnect = 0;
                var arr = this.NodesArr;
                for(var n = 0; arr && n < arr.length; n++)
                {
                    var Node = arr[n];
                    if(!Node)
                        continue;
                    if(!this.IsCanConnect(Node))
                        continue;
                    
                    var DeltaTime = CurTime - Node.StartTimeConnect;
                    if(!Node.Active && WasDoConnect < 5 && !Node.WasAddToConnect && DeltaTime >= Node.NextConnectDelta)
                    {
                        this.AddToConnect(Node)
                        WasDoConnect++
                    }
                }
            }
            while(this.ActualNodes.size > MustCount)
            {
                var Node = this.ActualNodes.max();
                AddNodeInfo(Node, "DeleteFromActive")
                this.DeleteNodeFromActive(Node)
            }
        }
        else
        {
            this.DetectGrayMode()
            for(var Level = 0; Level < ArrTree.length; Level++)
            {
                var arr = ArrTree[Level];
                if(!arr)
                    continue;
                PrepareBlockProcessSort(arr)
                arr.sort(SortNodeBlockProcessCount)
                
                var WasDoConnect = 0;
                var WasDoHot = 0;
                var length = Math.min(arr.length, 10);
                for(var n = 0; n < length; n++)
                {
                    var Node = arr[n];
                    var DeltaTime = CurTime - Node.StartTimeConnect;
                    if(!Node.Active && WasDoConnect < 5 && !Node.WasAddToConnect && DeltaTime >= Node.NextConnectDelta)
                    {
                        this.AddToConnect(Node)
                        WasDoConnect++
                    }
                    
                    DeltaTime = CurTime - Node.StartTimeHot
                    if(Node.Active && !Node.Hot && WasDoHot < MIN_CONNECT_CHILD && DeltaTime > Node.NextHotDelta && !Node.GrayConnect)
                    {
                        
                        AddNodeInfo(Node, "To hot level")
                        this.StartAddLevelConnect(Node)
                        Node.StartTimeHot = CurTime
                        Node.NextHotDelta = Node.NextHotDelta * 2
                        WasDoHot++
                    }
                    if(Node.Hot)
                        WasDoHot++
                }
                this.CheckDisconnectHot(Level)
            }
        }
    }
    ValueToXOR(StrType, Str)
    {
        var Arr1 = toUTF8Array(Str);
        var Arr2 = shaarr(this.CommonKey + ":" + this.addrStr + ":" + StrType);
        return WALLET.XORHash(Arr1, Arr2, 32);
    }
    ValueFromXOR(Node, StrType, Arr1)
    {
        var Arr2 = shaarr(this.CommonKey + ":" + Node.addrStr + ":" + StrType);
        var Arr = WALLET.XORHash(Arr1, Arr2, 32);
        var Str = Utf8ArrayToStr(Arr);
        return Str;
    }
    NetAddConnect(ID)
    {
        var Node = this.FindNodeByID(ID);
        if(!Node)
            return "NODE NOT FOUND";
        
        Node.NextConnectDelta = 1000
        Node.CreateConnect()
        return "OK";
    }
    NetAddBan(ID)
    {
        var Node = this.FindNodeByID(ID);
        if(!Node)
            return "NODE NOT FOUND";
        
        this.AddToBan(Node, "=BAN=")
        return "OK";
    }
    
    NetAddHot(ID)
    {
        var Node = this.FindNodeByID(ID);
        if(!Node)
            return "NODE NOT FOUND";
        
        this.StartAddLevelConnect(Node)
        return "OK";
    }
    
    NetDeleteNode(ID)
    {
        var Node = this.FindNodeByID(ID);
        if(!Node)
            return "NODE NOT FOUND";
        
        this.StartDisconnectHot(Node, "=DEL=", 1)
        return "OK";
    }
    
    FindNodeByID(ID)
    {
        for(var i = 0; i < this.NodesArr.length; i++)
        {
            var Node = this.NodesArr[i];
            if(Node.id === ID)
                return Node;
        }
        return undefined;
    }
};

function PrepareBlockProcessSort(Arr)
{
    for(var i = 0; i < Arr.length; i++)
    {
        var Item = Arr[i];
        var BlockProcessCount = Item.BlockProcessCount;
        if(BlockProcessCount < 0)
            Item.BlockProcessCountLg =  - 1;
        else
            if(BlockProcessCount === 0)
                Item.BlockProcessCountLg = 0;
            else
                Item.BlockProcessCountLg = 1 + Math.floor(Math.log10(BlockProcessCount));
    }
}

function SortNodeBlockProcessCount(a,b)
{
    var BlockProcessCount1 = a.BlockProcessCountLg;
    var BlockProcessCount2 = b.BlockProcessCountLg;
    
    if(BlockProcessCount2 !== BlockProcessCount1)
        return BlockProcessCount2 - BlockProcessCount1;
    
    if(a.DeltaTime !== b.DeltaTime)
        return a.DeltaTime - b.DeltaTime;
    
    return a.id - b.id;
}
function SortNodeBlockProcessCountGray(a,b)
{
    if(a.StartFindList !== b.StartFindList)
        return a.StartFindList - b.StartFindList;
    
    return SortNodeBlockProcessCount(a, b);
}

function GetGrayServerConnections()
{
    var Count = MAX_GRAY_CONNECTIONS_TO_SERVER;
    if(SERVER.LoadHistoryMode && SERVER.LoadHistoryMessage)
        Count = Count * 10;
    
    return Count;
}
global.GetGrayServerConnections = GetGrayServerConnections;
global.PrepareBlockProcessSort = PrepareBlockProcessSort;
global.SortNodeBlockProcessCount = SortNodeBlockProcessCount;

function CompareNodeIPPort(node1,node2)
{
    if(node1.ip < node2.ip)
        return  - 1;
    if(node1.ip > node2.ip)
        return 1;
    
    return node1.port - node2.port;
}
