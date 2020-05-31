/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


global.PROCESS_NAME = "STATIC";

const crypto = require('crypto');
const fs = require('fs');

require("../core/constant");
require('../core/block-loader-const');
require('../core/rest_tables.js');
require('../system/accounts.js');
require('../system/smart.js');

global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
require("../core/library");



global.READ_ONLY_DB = 1;

require("./child-process");

process.on('message', function (msg)
{
    switch(msg.cmd)
    {
        case "GETBLOCKHEADER":
            GETBLOCKHEADER(msg);
            break;
        case "GETBLOCKHEADER100":
            GETBLOCKHEADER100(msg);
            break;
            
        case "GETBLOCK":
            GETBLOCK(msg);
            break;
        case "GETCODE":
            GETCODE(msg);
            break;
            
        case "GETREST":
            GETREST(msg);
            break;
            
        case "GETSMART":
            GETSMART(msg);
            break;
    }
}
);

var CServerDB = require("../core/db/block-db");
var KeyPair = crypto.createECDH('secp256k1');
KeyPair.setPrivateKey(Buffer.from([77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77,
77, 77, 77, 77, 77, 77, 77, 77, 77, 77]));
global.SERVER = new CServerDB(KeyPair, undefined, undefined, false, true);

global.HTTP_PORT_NUMBER = 0;


setInterval(function ()
{
    if(SERVER)
        SERVER.Close();
    
    DApps.Accounts.Close();
    DApps.Smart.DBSmart.Close();
}
, 1000);

function GETBLOCKHEADER100(msg)
{
    return;
    
    var Data = msg.Data;
    var BlockNum = Data.BlockNum;
    if(BlockNum % 100 !== 0)
        return;
    var EndNum100 = BlockNum / 100;
    
    var LoadHash100 = Data.Hash;
    var Hash100;
    
    var Count = Data.Count;
    if(!Count || Count < 0 || !EndNum100)
        return;
    
    if(Count > COUNT_BLOCKS_FOR_LOAD)
        Count = COUNT_BLOCKS_FOR_LOAD;
    
    var Arr = [];
    var Data100 = SERVER.DBHeader100.Read(EndNum100);
    if(Data100 && CompareArr(Data100.Hash100, LoadHash100) === 0)
    {
        var StartNum = EndNum100 - Count + 1;
        if(StartNum < 0)
            StartNum = 0;
        for(var Num = StartNum; Num <= EndNum100; Num++)
        {
            Data100 = SERVER.DBHeader100.Read(Num);
            if(Num === StartNum)
                Arr.push(Data100.Hash100);
            Arr.push(Data100.Hash);
        }
    }
    
    var BufWrite = BufLib.GetBufferFromObject(Arr, "[hash]", MAX_PACKET_LENGTH, {});
    
    ToLog("GETBLOCKHEADER100 Send Arr=" + Arr.length + " - " + BlockNum);
    
    process.send({cmd:"Send", addrStr:msg.addrStr, Method:"RETBLOCKHEADER100", Context:msg.Context, Data:BufWrite});
}

function GETBLOCKHEADER(msg)
{
    var Data = msg.Data;
    var StartNum = undefined;
    
    var BlockNum;
    var LoadHash = Data.Hash;
    var Foward = Data.Foward;
    if(Foward)
    {
        var BlockDB = SERVER.ReadBlockHeaderDB(Data.BlockNum);
        if(BlockDB && BlockDB.SumHash && (CompareArr(BlockDB.SumHash, LoadHash) === 0 || IsZeroArr(LoadHash)))
        {
            StartNum = Data.BlockNum - BLOCK_PROCESSING_LENGTH2;
            if(StartNum < 0)
                StartNum = 0;
            BlockNum = StartNum + COUNT_BLOCKS_FOR_LOAD + BLOCK_PROCESSING_LENGTH2;
            if(BlockNum > SERVER.GetMaxNumBlockDB())
                BlockNum = SERVER.GetMaxNumBlockDB();
        }
    }
    else
    {
        BlockNum = Data.BlockNum;
        var IsSum = Data.IsSum;
        var Count = Data.Count;
        if(!Count || Count < 0 || BlockNum < 0)
            return;
        
        if(Count > COUNT_BLOCKS_FOR_LOAD)
            Count = COUNT_BLOCKS_FOR_LOAD;
        Count += BLOCK_PROCESSING_LENGTH2;
        
        var BlockDB = SERVER.ReadBlockHeaderDB(BlockNum);
        
        if(BlockDB && (BlockDB.Prepared && (!IsSum) && BlockDB.Hash && CompareArr(BlockDB.Hash, LoadHash) === 0 || BlockDB.bSave && IsSum && BlockDB.SumHash && CompareArr(BlockDB.SumHash,
        LoadHash) === 0))
        {
            StartNum = BlockNum - Count + 1;
            if(StartNum < 0)
                StartNum = 0;
        }
    }
    
    var BufWrite = SERVER.BlockChainToBuf(StartNum, StartNum, BlockNum);
    process.send({cmd:"Send", addrStr:msg.addrStr, Method:"RETBLOCKHEADER", Context:msg.Context, Data:BufWrite});
}

function GETBLOCK(msg)
{
    var Data = msg.Data;
    var BlockNum = Data.BlockNum;
    var TreeHash = Data.TreeHash;
    
    if(msg.Context.SendCount)
    {
        return;
    }
    
    var BufWrite;
    var BlockDB = SERVER.ReadBlockDB(BlockNum);
    
    var StrSend;
    if(BlockDB && (CompareArr(BlockDB.TreeHash, TreeHash) === 0 || IsZeroArr(TreeHash)))
    {
        var BufWrite = BufLib.GetBufferFromObject(BlockDB, FORMAT_BLOCK_TRANSFER, MAX_PACKET_LENGTH, WRK_BLOCK_TRANSFER);
        StrSend = "OK";
    }
    
    if(StrSend === "OK")
    {
        ADD_TO_STAT("BLOCK_SEND");
    }
    else
    {
        BufWrite = BufLib.GetNewBuffer(100);
        StrSend = "NO";
    }
    
    process.send({cmd:"Send", addrStr:msg.addrStr, Method:"RETGETBLOCK", Context:msg.Context, Data:BufWrite});
}

function GETCODE(msg)
{
    var VersionNum = msg.Data;
    var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
    if(fs.existsSync(fname))
    {
        
        var data = fs.readFileSync(fname);
        process.send({cmd:"Send", addrStr:msg.addrStr, Method:"RETCODE", Context:msg.Context, Data:data});
    }
}

function GETREST(msg)
{
    var Data = msg.Data;
    if(!Data.BlockNum)
        return;
    if(IsZeroArr(Data.AccHash))
    {
        return;
    }
    
    var BlockNumRest = Data.BlockNum;
    
    var BlockDB = SERVER.ReadBlockHeaderDB(BlockNumRest);
    if(!BlockDB)
    {
        ToLog("NOT find block: " + BlockNumRest + " from node: " + msg.NodeName, 4);
        return;
    }
    
    ToLog("Got GETREST block: " + BlockNumRest + " from node: " + msg.NodeName, 4);
    
    var RestIndexArr = GetCurrentRestArr();
    var nResult = 0;
    for(var i = 0; i < RestIndexArr.length; i++)
    {
        if(RestIndexArr[i] === BlockNumRest)
        {
            nResult = 1;
            break;
        }
    }
    
    var BufLength = 1000;
    var ProofHash = [];
    var ProofArrL = [];
    var ProofArrR = [];
    var ArrRest = [];
    if(nResult)
    {
        var WorkStruct = {};
        var WorkFormat = DApps.Accounts.FORMAT_ACCOUNT_ROW;
        var WorkFormatLength = DApps.Accounts.SIZE_ACCOUNT_ROW;
        var Max = DApps.Accounts.DBState.GetMaxNum();
        
        var LengthAccount = Data.Count;
        if(LengthAccount > MAX_ACCOUNTS_TRANSFER)
            LengthAccount = MAX_ACCOUNTS_TRANSFER;
        
        var StartAccount = Data.AccNum;
        var EndAccount = StartAccount + LengthAccount - 1;
        if(EndAccount > Max)
            EndAccount = Max;
        
        var Tree = GetRestMerkleTree(BlockNumRest, RestIndexArr);
        if(CompareArr(Data.AccHash, Tree.Root) !== 0)
        {
            ToLog("Get bad rest acc hash: " + BlockNumRest + " = " + GetHexFromArr(Data.AccHash).substr(0, 8) + "/" + GetHexFromArr(Tree.Root).substr(0,
            8), 3);
            ArrRest = [];
            nResult = 0;
        }
        else
        {
            ArrRest = GetArrRest(BlockNumRest, StartAccount, EndAccount);
            ProofHash = Tree.Root;
            var RetProof = GetMerkleProof(Tree.LevelsHash, StartAccount, EndAccount);
            ProofArrL = RetProof.ArrL;
            ProofArrR = RetProof.ArrR;
            
            BufLength = 1000 + ArrRest.length * WorkFormatLength;
            BufLength += ProofArrL.length * 32 + ProofArrR.length * 32 + 32;
        }
    }
    var Data2 = {Result:nResult, Arr:ArrRest, Version:1, ProofHash:ProofHash, ProofArrL:ProofArrL, ProofArrR:ProofArrR};
    var BufWrite = BufLib.GetBufferFromObject(Data2, FORMAT_REST_TRANSFER, BufLength, {});
    process.send({cmd:"Send", addrStr:msg.addrStr, Method:"RETREST", Context:msg.Context, Data:BufWrite});
}

function GETSMART(msg)
{
    var Data = msg.Data;
    if(!Data.Count)
        return;
    
    var BufLength = 1000;
    var SizeForSend = 200 * 1024;
    var Arr = [];
    for(var Num = Data.SmartNum; Num < Data.SmartNum + Data.Count; Num++)
    {
        var BufSmart = DApps.Smart.DBSmart.Read(Num, 1);
        if(!BufSmart)
            break;
        
        SizeForSend = SizeForSend - BufSmart.length;
        if(SizeForSend < 0)
            break;
        
        BufLength += BufSmart.length;
        Arr.push(BufSmart);
    }
    
    var Data2 = {Result:Arr.length ? 1 : 0, Arr:Arr};
    var BufWrite = BufLib.GetBufferFromObject(Data2, FORMAT_SMART_TRANSFER, BufLength, {});
    process.send({cmd:"Send", addrStr:msg.addrStr, Method:"RETSMART", Context:msg.Context, Data:BufWrite});
}

var glMapForHash = {};
function GetArrRest(BlockNumRest,StartAccount,EndAccount,bHashOnly)
{
    var ArrRest = [];
    var WorkStruct = {};
    var WorkFormat = DApps.Accounts.FORMAT_ACCOUNT_ROW;
    var WorkFormatLength = DApps.Accounts.SIZE_ACCOUNT_ROW;
    
    for(var Num = StartAccount; Num <= EndAccount; Num++)
    {
        var FindItem = undefined;
        var RestData = DApps.Accounts.ReadRest(Num);
        
        var CountZero = 0;
        for(var i = RestData.Arr.length - 1; i >= 0; i--)
        {
            var Item = RestData.Arr[i];
            if(!Item.BlockNum)
            {
                CountZero++;
                continue;
            }
            
            if(Item.BlockNum <= BlockNumRest)
            {
                if(!FindItem || Item.BlockNum > FindItem.BlockNum)
                {
                    FindItem = Item;
                }
            }
        }
        
        var BlocNumMap = 0;
        var StateDataValue = undefined;
        if(FindItem)
        {
            StateDataValue = FindItem.Value;
            BlocNumMap = Item.BlockNum;
        }
        else
        {
            if(CountZero !== RestData.Arr.length)
                continue;
        }
        
        var StateData = DApps.Accounts.DBState.Read(Num);
        if(!StateData)
            break;
        if(StateDataValue)
            StateData.Value = StateDataValue;
        
        if(bHashOnly)
        {
            var key = "" + Num + "-" + BlocNumMap;
            var Hash = glMapForHash[key];
            if(!Hash)
            {
                var Buf = BufLib.GetBufferFromObject(StateData, WorkFormat, WorkFormatLength, WorkStruct);
                Hash = shaarr(Buf);
                glMapForHash[key] = Hash;
            }
            ArrRest.push(Hash);
        }
        else
        {
            var Buf = BufLib.GetBufferFromObject(StateData, WorkFormat, WorkFormatLength, WorkStruct);
            ArrRest.push(Buf);
        }
    }
    
    return ArrRest;
}

var glMapRest = {};
function GetRestMerkleTree(BlockNumRest,RestIndexArr)
{
    var MerkleTree = glMapRest[BlockNumRest];
    if(MerkleTree)
    {
        var Delta = Date.now() - MerkleTree.StratTime;
        if(Delta > 3600 * 1000)
            MerkleTree = undefined;
    }
    
    if(!MerkleTree)
    {
        ToLog("Create new glMapRest key: " + BlockNumRest, 2);
        
        var startTime = process.hrtime();
        
        var EndAccount = DApps.Accounts.DBState.GetMaxNum();
        var ArrHash = GetArrRest(BlockNumRest, 0, EndAccount, 1);
        
        var Time1 = process.hrtime(startTime);
        
        var MerkleCalc = {};
        MerkleTree = {LevelsHash:[ArrHash], RecalcCount:0, StratTime:Date.now()};
        
        for(var Num = 0; Num < ArrHash.length; Num++)
        {
            MerkleCalc[Num] = 1;
        }
        
        UpdateMerklTree(MerkleTree, MerkleCalc, 0);
        glMapRest[BlockNumRest] = MerkleTree;
        
        var Time2 = process.hrtime(startTime);
        var deltaTime1 = (Time1[0] * 1000 + Time1[1] / 1e6) / 1000;
        var deltaTime2 = (Time2[0] * 1000 + Time2[1] / 1e6) / 1000;
        ToLog("Create delta time: " + deltaTime1 + "/" + deltaTime2 + " s   Tree.Root=" + GetHexFromArr(MerkleTree.Root), 2);
        var MapIndex = {};
        for(var i = 0; i < RestIndexArr.length; i++)
        {
            MapIndex[RestIndexArr[i]] = 1;
        }
        for(var key in glMapRest)
        {
            if(!MapIndex[key])
            {
                ToLog("Delete old glMapRest key: " + key, 2);
                delete glMapRest[key];
            }
        }
    }
    
    return MerkleTree;
}
