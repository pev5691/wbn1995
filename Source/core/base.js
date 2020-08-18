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
require("./crypto-library");
require("./terahashmining");
const crypto = require('crypto');

const os = require('os');

global.glStopNode = false;

const MAX_TIME_NETWORK_TRANSPORT = 1 * 1000;
var GlSumUser;
var GlSumSys;
var GlSumIdle;

global.CountAllNode = 0;
global.CountConnectedNode = 0;

module.exports = class CCommon
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        global.SERVER = this
        
        this.VirtualMode = bVirtual
        
        this.KeyPair = SetKeyPair
        var PubKey = SetKeyPair.getPublicKey('', 'compressed');
        this.PubKeyType = PubKey[0]
        this.addrArr = PubKey.slice(1)
        this.addrStr = GetHexFromArr(this.addrArr)
        this.HashDBArr = shaarr2(this.KeyPair.getPrivateKey(), [0, 0, 0, 0, 0, 0, 0, 1])
        
        this.ServerSign = []
    }
    
    AddStatOnTimer()
    {
        var CountAll = 0;
        var CurTime = GetCurrentTime() - 0;
        for(var i = 0; i < this.NodesArr.length; i++)
        {
            var Item = this.NodesArr[i];
            if(Item.LastTime && (CurTime - Item.LastTime) < NODES_DELTA_CALC_HOUR * 3600 * 1000)
                CountAll++
            else
                if(Item.LastTimeGetNode && (CurTime - Item.LastTimeGetNode) < NODES_DELTA_CALC_HOUR * 3600 * 1000)
                    CountAll++
        }
        global.CountAllNode = CountAll
        if(!global.STAT_MODE)
            return;
        
        var StateTX = DApps.Accounts.DBStateTX.Read(0);
        if(StateTX)
        {
            var Delta = this.CurrentBlockNum - StateTX.BlockNum;
            ADD_TO_STAT("MAX:DELTA_TX", Delta)
        }
        var bHasCP = 0;
        if(CHECK_POINT.BlockNum)
        {
            var Block = this.ReadBlockHeaderDB(CHECK_POINT.BlockNum);
            if(Block && CompareArr(CHECK_POINT.Hash, Block.Hash) === 0)
                bHasCP = 1
        }
        
        var MinVer = global.MIN_VER_STAT;
        if(MinVer === 0)
            MinVer = global.UPDATE_CODE_VERSION_NUM
        
        var BufMap = {}, BufMap2 = {};
        var arr = this.GetActualNodes();
        var Count = 0, CountHot = 0, CountHotOK = 0, CountActualOK = 0, SumDeltaHot = 0, SumDeltaActual = 0, CountCP = 0, CountLH = 0,
        CountHash = 0, CountVer = 0, CountStop = 0;
        var CountAutoCorrectTime = 0;
        var SumAvgDeltaTime = 0;
        for(var i = 0; i < arr.length; i++)
        {
            var Node = arr[i];
            if(!Node || Node.IsAddrList)
                continue;
            var INFO = Node.INFO;
            if(!INFO)
                INFO = {}
            
            if(bHasCP && CHECK_POINT.BlockNum && INFO.CheckPointHashDB && CompareArr(CHECK_POINT.Hash, INFO.CheckPointHashDB) === 0)
            {
                CountCP++
            }
            if(INFO.LoadHistoryMode)
                CountLH++
            
            if(Node.StopGetBlock)
                CountStop++
            
            Count++
            SumAvgDeltaTime += Node.DeltaGlobTime
            
            if(Node.VersionNum >= MinVer)
                CountVer++
            
            if(INFO && INFO.BlockNumDB && INFO.BlockNumDB <= this.BlockNumDB)
            {
                var HashDB = ReadHashFromBufDB(BufMap2, INFO.BlockNumDB);
                if(HashDB && CompareArr(HashDB, INFO.HashDB) === 0)
                    CountHash++
            }
            
            var StrChk = GetCheckAccHash(BufMap, INFO.AccountBlockNum, INFO.AccountsHash);
            var Chck = 0;
            if(StrChk.indexOf("=OK=") >= 0)
            {
                Chck = 1
            }
            var DeltaTime = Node.DeltaTime;
            if(!DeltaTime)
                DeltaTime = 0
            
            CountActualOK += Chck
            SumDeltaActual += DeltaTime
            
            if(Node.Hot)
            {
                CountHot++
                CountHotOK += Chck
                SumDeltaHot += DeltaTime
            }
            
            if(INFO.AutoCorrectTime)
                CountAutoCorrectTime++
        }
        
        global.CountConnectedNode = Count
        
        ADD_TO_STAT("MAX:ALL_NODES", CountAll)
        ADD_TO_STAT("MAX:CONNECTED_NODES", Count)
        ADD_TO_STAT("MAX:HOT_NODES", CountHot)
        ADD_TO_STAT("MAX:HOT_OK", CountHotOK)
        ADD_TO_STAT("MAX:ACTUAL_OK", CountActualOK)
        ADD_TO_STAT("MAX:CHECK_POINT_OK", CountCP)
        ADD_TO_STAT("MAX:COUNTLH", CountLH)
        ADD_TO_STAT("MAX:HASH_OK", CountHash)
        ADD_TO_STAT("MAX:MIN_VERSION", CountVer)
        ADD_TO_STAT("MAX:STOP_GET", CountStop)
        
        ADD_TO_STAT("MAX:AUTOCORRECT", CountAutoCorrectTime)
        
        ADD_TO_STAT("MAX:TIME_DELTA", DELTA_CURRENT_TIME)
        
        if(!Count)
            Count = 1
        if(!CountHot)
            CountHot = 1
        
        if(Count >= 20)
        {
            var SumDeltaAvg = 0;
            var AvgGlobTime = SumAvgDeltaTime / Count;
            for(var i = 0; i < arr.length; i++)
            {
                var Node = arr[i];
                if(!Node || Node.IsAddrList)
                    continue;
                
                var Delta = AvgGlobTime - Node.DeltaGlobTime;
                SumDeltaAvg += Delta * Delta
            }
            SumDeltaAvg = Math.sqrt(SumDeltaAvg / Count)
            
            ADD_TO_STAT("MAX:DELTA_GLOB_TIME", 100 + AvgGlobTime)
            ADD_TO_STAT("MAX:DISP_DELTA_GLOB_TIME", SumDeltaAvg)
            arr.sort(function (a,b)
            {
                return a.DeltaGlobTime - b.DeltaGlobTime;
            })
            var SumDeltaAvgM = 0;
            var AvgGlobTimeM = arr[Math.trunc(arr.length / 2)].DeltaGlobTime;
            var Length = arr.length;
            var Start = Math.trunc(Length * 0.05);
            var End = Math.trunc(Length * 0.95);
            var NodesCount = 0;
            for(var i = Start; i < End; i++)
            {
                var Node = arr[i];
                if(!Node || Node.IsAddrList)
                    continue;
                
                NodesCount++
                var Delta = AvgGlobTimeM - Node.DeltaGlobTime;
                SumDeltaAvgM += Delta * Delta
            }
            if(!NodesCount)
                NodesCount = 1
            SumDeltaAvgM = Math.sqrt(SumDeltaAvgM / NodesCount)
            
            ADD_TO_STAT("MAX:MEDIAN_GLOB_TIME", 100 + AvgGlobTimeM)
            ADD_TO_STAT("MAX:DISP_MEDIAN_GLOB_TIME", SumDeltaAvgM)
        }
        
        ADD_TO_STAT("MAX:DELTA_TIME_HOT", SumDeltaHot / CountHot)
        ADD_TO_STAT("MAX:DELTA_TIME_ACTUAL", SumDeltaActual / Count)
        ADD_TO_STAT("MAX:MEMORY_USAGE", process.memoryUsage().heapTotal / 1024 / 1024)
        ADD_TO_STAT("MAX:MEMORY_FREE", os.freemem() / 1024 / 1024)
        
        var SumUser = 0;
        var SumSys = 0;
        var SumIdle = 0;
        var cpus = os.cpus();
        for(var i = 0; i < cpus.length; i++)
        {
            var cpu = cpus[i];
            SumUser += cpu.times.user
            SumSys += cpu.times.sys + cpu.times.irq
            SumIdle += cpu.times.idle
        }
        if(GlSumUser !== undefined)
        {
            var maxsum = cpus.length * 1000;
            ADD_TO_STAT("MAX:CPU_USER_MODE", Math.min(maxsum, SumUser - GlSumUser))
            ADD_TO_STAT("MAX:CPU_SYS_MODE", Math.min(maxsum, SumSys - GlSumSys))
            ADD_TO_STAT("MAX:CPU_IDLE_MODE", Math.min(maxsum, SumIdle - GlSumIdle))
            ADD_TO_STAT("MAX:CPU", Math.min(maxsum, SumUser + SumSys - GlSumUser - GlSumSys))
        }
        GlSumUser = SumUser
        GlSumSys = SumSys
        GlSumIdle = SumIdle
    }
    GetNewMeta()
    {
        return crypto.randomBytes(32);
    }
};

class SMemBuffer
{
    constructor(MaxTime, CheckName)
    {
        this.MetaMap1 = {}
        this.MetaMap2 = {}
        this.CheckName = CheckName
        
        setInterval(this.ShiftMapDirect.bind(this), MaxTime)
    }
    GetStrKey(Arr)
    {
        if(typeof Arr === "number" || typeof Arr === "string")
        {
            return Arr;
        }
        else
        {
            return GetHexFromAddres(Arr);
        }
        
        throw "NOT RET!";
    }
    
    LoadValue(Arr, bStay)
    {
        if(!Arr)
            return undefined;
        var Key = this.GetStrKey(Arr);
        
        var Value = this.MetaMap1[Key];
        if(Value !== undefined)
        {
            if(!bStay)
                delete this.MetaMap1[Key]
            return Value;
        }
        
        Value = this.MetaMap2[Key]
        if(Value !== undefined)
        {
            if(!bStay)
                delete this.MetaMap2[Key]
        }
        return Value;
    }
    
    SaveValue(Arr, Value)
    {
        var Key = this.GetStrKey(Arr);
        if(Value !== undefined)
            this.MetaMap1[Key] = Value
    }
    
    ShiftMapDirect()
    {
        if(glStopNode)
            return;
        
        if(this.CheckName)
        {
            var Count = 0;
            for(var key in this.MetaMap2)
            {
                Count++
            }
            if(Count)
            {
                ADD_TO_STAT(this.CheckName, 1, 1)
            }
        }
        this.MetaMap2 = this.MetaMap1
        this.MetaMap1 = {}
    }
    Clear()
    {
        this.MetaMap2 = {}
        this.MetaMap1 = {}
    }
}
class STreeBuffer
{
    constructor(MaxTime, CompareFunction, KeyType, CheckName)
    {
        this.KeyType = KeyType
        this.MetaTree1 = new RBTree(CompareFunction)
        this.MetaTree2 = new RBTree(CompareFunction)
        this.CheckName = CheckName
        
        setInterval(this.ShiftMapDirect.bind(this), MaxTime)
    }
    
    LoadValue(Hash, bStay)
    {
        if(!Hash)
            return undefined;
        
        if(typeof Hash !== this.KeyType)
            throw "MUST ONLY HASH ARRAY: " + Hash;
        
        var element = this.MetaTree1.find({hash:Hash});
        if(element)
        {
            if(!bStay)
                this.MetaTree1.remove(element)
            return element.value;
        }
        
        element = this.MetaTree2.find({hash:Hash})
        if(element)
        {
            if(!bStay)
                this.MetaTree2.remove(element)
            return element.value;
        }
        return undefined;
    }
    
    SaveValue(Hash, Value)
    {
        if(typeof Hash !== this.KeyType)
            throw "MUST ONLY TYPE=" + this.KeyType + " in " + Hash;
        
        if(Value !== undefined)
        {
            var element = this.MetaTree1.find({hash:Hash});
            if(element)
                element.value = Value
            else
                this.MetaTree1.insert({hash:Hash, value:Value})
        }
    }
    
    ShiftMapDirect()
    {
        
        if(this.CheckName && this.MetaTree2.size)
        {
            ADD_TO_STAT(this.CheckName, this.MetaTree2.size, 1)
            
            var it = this.MetaTree2.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                var Name = Item.value.Name;
                
                ADD_TO_STAT(this.CheckName + ":" + Name, 1, 1)
            }
        }
        
        this.MetaTree2.clear()
        var empty_tree = this.MetaTree2;
        
        this.MetaTree2 = this.MetaTree1
        this.MetaTree1 = empty_tree
    }
    
    Clear()
    {
        this.MetaTree1.clear()
        this.MetaTree2.clear()
    }
};

function ReadHashFromBufDB(Map,BlockNum)
{
    var MyHash = Map[BlockNum];
    if(!MyHash)
    {
        var Block = SERVER.ReadBlockHeaderDB(BlockNum);
        if(Block)
            MyHash = Block.Hash;
        else
            MyHash = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        Map[BlockNum] = MyHash;
    }
    return MyHash;
}

function GetCheckAccHash(Map,BlockNum,Hash)
{
    var MyHash = Map[BlockNum];
    if(!MyHash)
    {
        MyHash = DApps.Accounts.GetHashOrUndefined(BlockNum);
        Map[BlockNum] = MyHash;
    }
    
    if(MyHash)
    {
        if(!Hash)
            return "=ERR:NO=";
        
        if(CompareArr(Hash, MyHash) !== 0)
            return "=ERR:BAD=";
        else
            return "=OK=";
    }
    else
    {
        if(!Hash)
            return "=OK=:NO";
        else
            return "=MY:NO=";
    }
}
global.GetCheckAccHash = GetCheckAccHash;
global.ReadHashFromBufDB = ReadHashFromBufDB;
global.STreeBuffer = STreeBuffer;


global.TestCreateTr = TestCreateTr;
function TestCreateTr()
{
    const FORMAT_CREATE = "{\
        Type:byte,\
        Currency:uint,\
        PubKey:arr33,\
        Description:str40,\
        Adviser:uint,\
        Reserve:arr7,\
        POWCreate:arr12,\
        }";
    
    var TR = {Type:100, Currency:0, PubKey:[2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0], Description:"Description", Adviser:10, };
    var Body = BufLib.GetBufferFromObject(TR, FORMAT_CREATE, 1000, {});
    var startTime = process.hrtime();
    var StartData = Date.now();
    var nonce = CreateHashBodyPOWInnerMinPowerTest(Body, 1000, 17);
    var Time = process.hrtime(startTime);
    
    var power = GetPowPower(shaarr(Body));
    var deltaTime = (Time[0] * 1000 + Time[1] / 1e6) / 1000;
    var DeltaData = (new Date() - StartData) / 1000;
    
    ToLog("power=" + power + "  nonce=" + nonce + " TIME=" + deltaTime + " sec" + "  DeltaData=" + DeltaData + " sec");
    return {time1:deltaTime, time2:DeltaData};
}

function CreateHashBody(body,Num,Nonce)
{
    body.writeUIntLE(Num, body.length - 12, 6);
    body.writeUIntLE(Nonce, body.length - 6, 6);
    return shaarr(body);
}

function CreateHashBodyPOWInnerMinPowerTest(arr,BlockNum,MinPow)
{
    var nonce = 0;
    while(1)
    {
        var arrhash = CreateHashBody(arr, BlockNum, nonce);
        var power = GetPowPower(arrhash);
        if(power >= MinPow)
        {
            return nonce;
        }
        nonce++;
    }
}


