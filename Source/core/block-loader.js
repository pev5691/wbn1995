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

const fs = require("fs");
const crypto = require('crypto');
require('./block-loader-const');

const STAT_BLOCK_LOAD_PERIOD = CONSENSUS_PERIOD_TIME / 5;

module.exports = class CBlock extends require("./rest-loader.js")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        
        this.MapMapLoaded = {}
        this.BlockChain = {}
        
        this.ChainID = 0
        this.BlockID = 0
        this.TaskNodeIndex = 0
        this.LoadedChainList = []
        this.LastChainLoad = undefined
        this.StartLoadBlockTime = 0
        
        this.LoadHistoryMode = false
        this.MapBlockBodyLoad = {}
        
        if(!global.ADDRLIST_MODE && !this.VirtualMode && !global.TEST_JINN)
        {
            
            let Self = this;
            setTimeout(function ()
            {
                Self.CheckStartedBlocks()
                setInterval(Self.LoopChainLoad.bind(Self), 100)
                setInterval(Self.LoopBlockLoad.bind(Self), 10)
                setInterval(Self.LoopBlockBodyLoad.bind(Self), 1 * 1000)
            }, 1000)
        }
    }
    
    StopNode()
    {
        global.glStopNode = true
    }
    
    GenesisBlockHeaderDB(Num)
    {
        if(Num < 0)
            return undefined;
        
        var Block = {BlockNum:Num, TreeHash:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0], AddrHash:DEVELOP_PUB_KEY0, Hash:this.GetHashGenesis(Num), PowHash:this.GetHashGenesis(Num), PrevHash:[0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], SeqHash:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], PrevSumHash:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], SumHash:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], Comment1:"GENESIS", Comment2:"", TrCount:0, TrDataPos:0, TrDataLen:0, };
        
        Block.SeqHash = GetSeqHash(Block.BlockNum, Block.PrevHash, Block.TreeHash)
        
        Block.SumPow = 0
        Block.bSave = true
        
        return Block;
    }
    
    CheckStartedBlocks()
    {
        this.FindStartBlockNum()
        if(this.UseTruncateBlockDB)
            this.TruncateBlockDB(this.UseTruncateBlockDB)
        
        var CurNum = GetCurrentBlockNumByTime();
        if(CurNum <= this.BlockNumDB)
        {
            this.TruncateBlockDB(CurNum)
        }
        
        CurNum = this.GetMaxNumBlockDB()
        if(CurNum <= this.BlockNumDB)
        {
            this.TruncateBlockDB(CurNum)
            this.BlockNumDB = CurNum
        }
        
        if(this.BlockNumDB < BLOCK_GENESIS_COUNT)
            this.CreateGenesisBlocks()
        
        if(fs.existsSync(GetCodePath("EXPERIMENTAL/_run.js")))
        {
            require(GetCodePath("EXPERIMENTAL/_run.js"))
        }
        
        if(global.TEST_JINN)
            return;
        
        GenerateStartedBlocks()
        
        this.LoadMemBlocksOnStart()
    }
    
    CreateGenesisBlocks()
    {
        var PrevArr = [];
        for(var n = 0; n < BLOCK_GENESIS_COUNT; n++)
        {
            var Block = this.GenesisBlockHeaderDB(n);
            PrevArr[n] = Block
            this.WriteBlockDB(Block)
        }
        return PrevArr;
    }
    GetLinkHash(Block)
    {
        var startPrev = Block.BlockNum - BLOCK_PROCESSING_LENGTH2;
        var Sum = 0;
        var arr = [];
        for(var i = 0; i < BLOCK_PROCESSING_LENGTH; i++)
        {
            var PrevBlock = this.GetBlock(startPrev + i);
            if(PrevBlock && PrevBlock.bSave)
            {
                Sum = Sum + PrevBlock.SumPow
                arr.push(PrevBlock.Hash)
            }
            else
            {
                return undefined;
            }
        }
        var PrevHash = CalcLinkHashFromArray(arr, Block.BlockNum);
        return PrevHash;
    }
    
    GetLinkHashDB(Block)
    {
        var startPrev = Block.BlockNum - BLOCK_PROCESSING_LENGTH2;
        var arr = [];
        for(var i = 0; i < BLOCK_PROCESSING_LENGTH; i++)
        {
            var num = startPrev + i;
            var PrevBlock = this.ReadBlockHeaderDB(num);
            if(!PrevBlock || !PrevBlock.bSave)
            {
                var StrDop = "";
                if(PrevBlock)
                    StrDop = "  NO Save"
                else
                    StrDop = "  NOT Found"
                ToLogTrace(" ERROR CALC BLOCK: " + Block.BlockNum + " - prev block " + StrDop + ": " + num + "  MaxNumBlockDB=" + this.GetMaxNumBlockDB())
                return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }
            arr.push(PrevBlock.Hash)
        }
        
        var PrevHash = CalcLinkHashFromArray(arr, Block.BlockNum);
        return PrevHash;
    }
    StartSyncBlockchain(Node, bSilent, bCheckPoint, PrevStartedBlockNum)
    {
        if(Date.now() - this.StartTime < 10 * 1000)
            return;
        
        this.FREE_ALL_MEM_CHAINS()
        if(global.NO_HISTORY_MODE)
        {
            this.LoadHistoryMode = 0
            return;
        }
        
        if(global.CREATE_ON_START && !LOCAL_RUN)
            return;
        
        if(!GrayConnect())
            this.RelayMode = true
        else
            this.RelayMode = false
        if(!bSilent)
            this.RelayMode = true
        
        var StartBlockNum;
        if(PrevStartedBlockNum)
        {
            var DeltaNum = this.BlockNumDB - PrevStartedBlockNum + 1000;
            if(DeltaNum < 1000)
                DeltaNum = 1000
            StartBlockNum = this.BlockNumDB - DeltaNum
            if(StartBlockNum <= 0)
                StartBlockNum = 15
            if(StartBlockNum <= this.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2 + 1)
            {
                DeltaNum = 0
                StartBlockNum = Math.min(this.BlockNumDB, this.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2 + 1)
                this.BlockNumDB = StartBlockNum
                this.TruncateBlockDB(StartBlockNum)
            }
            
            ToLog("Current DeltaNum=" + DeltaNum + "  StartBlockNum=" + StartBlockNum, 2)
        }
        else
        {
            StartBlockNum = this.BlockNumDB
        }
        
        this.LoadHistoryMode = true
        this.LoadHistoryMessage = !bSilent
        this.LoadHistoryContext = {PrevBlockNum: - 1, Node:Node, BlockNum:StartBlockNum, MapSend:{}, Foward:1, Pause:0, DeltaBlockNum:10,
            StartTimeHistory:Date.now(), MaxTimeOut:20 * 1000}
        
        if(!bSilent && !bCheckPoint && REST_START_COUNT)
        {
            this.CheckSyncRest()
        }
        
        if(this.ActualNodes && !this.ActualNodes.size)
        {
            ToLog("There is no connections to other nodes")
        }
        else
        {
            
            if(this.LoadHistoryMessage)
            {
                ToLog("Start synchronization", 2)
            }
        }
    }
    
    LoopSyncBlockchain()
    {
        if(!this.ActualNodes.size)
            return;
        
        var Context;
        if(this.LoadRestContext && this.LoadRestContext.Mode < 200)
            Context = this.LoadRestContext
        else
            Context = this.LoadHistoryContext
        if(Context.PrevBlockNum === Context.BlockNum)
        {
            var DeltaTime = Date.now() - Context.StartTimeHistory;
            if(DeltaTime > Context.MaxTimeOut)
            {
                ToLog("DETECT TIMEOUT LOAD", 2)
                this.StartSyncBlockchain(undefined, undefined, undefined, Context.BlockNum)
                return;
            }
        }
        else
        {
            Context.PrevBlockNum = Context.BlockNum
            Context.StartTimeHistory = Date.now()
        }
        
        if(Context.LoopSyncRest)
        {
            this.LoopSyncRest()
            return;
        }
        
        if(Context.Pause)
        {
            if(this.LoadedChainList.length)
            {
                return;
            }
            
            Context.Pause = 0
            Context.BlockNum = this.BlockNumDB
        }
        
        var BlockDB = this.ReadBlockHeaderDB(Context.BlockNum);
        
        if(!BlockDB || this.BlockNumDB >= GetCurrentBlockNumByTime() - BLOCK_PROCESSING_LENGTH - 2)
        {
            this.LoadHistoryMode = false
            if(this.LoadHistoryMessage)
                ToLog("Finish synchronization", 2)
            
            if(!BlockDB)
                return;
        }
        
        var Ret = this.GetNextNode(Context, Context.BlockNum, 1, Context.BlockNum);
        if(Ret.Result)
        {
            var Node = Ret.Node;
            ToLog("SEND LH Block: " + Context.BlockNum + " to " + NodeName(Node) + " atime=" + Node.DeltaTimeAvg, 4)
            
            let SELF = this;
            let BLOCKNUM = Context.BlockNum;
            Node.DeltaTimeAvg += 1000
            
            this.SendF(Node, {"Method":"GETBLOCKHEADER", "Context":Context, "Data":{Foward:1, BlockNum:Context.BlockNum, Hash:BlockDB.SumHash},
            })
            
            Context.F = function (Info)
            {
                var Node = Info.Node;
                var Result = SELF.RETBLOCKHEADER_FOWARD(Info);
                
                if(Result)
                {
                    if(Node.LastDeltaTime <= global.PERIOD_GET_BLOCK)
                        Node.BlockProcessCount += 2
                    else
                        if(Node.LastDeltaTime <= 2 * global.PERIOD_GET_BLOCK)
                            Node.BlockProcessCount += 1
                        else
                            Node.BlockProcessCount += 0
                }
                else
                {
                    Node.DeltaTimeAvg += 1000
                    Node.BlockProcessCount--
                    SELF.CheckBlockProcess(Node, "")
                    
                    if(GrayConnect())
                        Context.BlockNum--
                }
                ToLog("RETBLOCKHEADER_FOWARD: " + BLOCKNUM + " from " + NodeName(Node) + " Result=" + Result + " ltime=" + Node.LastDeltaTime,
                3)
            }
        }
        else
        {
        }
    }
    StartLoadBlockHeader(LoadHash, Num, StrInfo, bIsSum)
    {
        if(this.LoadHistoryMode)
            return;
        if(global.NO_HISTORY_MODE)
            return;
        
        this.StartLoadBlockTime = Date.now()
        
        if(Num > this.CurrentBlockNum + TIME_START_SAVE)
        {
            return;
        }
        
        bIsSum = bIsSum || false
        var Tree = this.GetHistoryTree("StartLoadBlockHeader");
        if(Tree.find({hash:LoadHash}))
            return false;
        Tree.insert({hash:LoadHash})
        
        var chain = {id:0, Count:16, BlockNum:Num, IsSum:bIsSum, Hash:LoadHash, time:undefined, FindBlockDB:false, LoadDB:false, LoadCountDB:0,
            LoadSumDB:0, LoadSum:0, ParentChain:undefined, RootChain:undefined, BlockNumStart:Num, HashStart:LoadHash, IsSumStart:bIsSum,
            BlockHead:undefined, MapSend:{}, Comment2:"", StopSend:false, Info:"", Error:false, };
        
        this.ChainBindMethods(chain)
        chain.AddInfo(StrInfo)
        
        this.SetChainNum(chain)
        
        var max = 3;
        while(max > 0)
        {
            max--
            if(!this.SendChainNext(chain, false))
                break;
        }
        
        return true;
    }
    
    SetChainNum(chain)
    {
        if(!chain.id)
        {
            this.ChainID++
            chain.id = this.ChainID
        }
        
        this.LoadedChainList.push(chain)
    }
    
    LoopChainLoad()
    {
        if(glStopNode)
            return;
        
        if(this.UseTruncateBlockDB)
            this.TruncateBlockDB(this.UseTruncateBlockDB)
        
        if(this.LoadHistoryMode)
        {
            this.LoopSyncBlockchain()
            return;
        }
        if(this.BlockNumDB < this.CurrentBlockNum - BLOCK_PROCESSING_LENGTH2)
        {
            this.StartSyncBlockchain()
            return;
        }
        if(global.LOAD_TO_BEGIN && this.BlockNumDBMin)
        {
            this.SendLoadToBegin()
        }
        
        var CountStopSend = 0;
        var min_num = this.CurrentBlockNum - MAX_COUNT_CHAIN_LOAD;
        var min_num_load = this.CurrentBlockNum;
        
        for(var i = 0; i < this.LoadedChainList.length; i++)
        {
            var chain = this.LoadedChainList[i];
            if(!chain)
            {
                this.LoadedChainList.splice(i, 1)
                continue;
            }
            var RootChain = chain.GetRootChain();
            if(chain.RootChain)
                chain.RootChain = RootChain
            
            if(RootChain.BlockNum < min_num_load)
                min_num_load = RootChain.BlockNum
            
            if(!chain.StopSend)
            {
                if(chain.BlockHead)
                {
                    if(chain.BlockNum < this.CurrentBlockNum - COUNT_HISTORY_BLOCKS_FOR_LOAD)
                    {
                        if(global.WATCHDOG_DEV)
                            ToLog("Very long length of blocks to load history, stop chain with id=" + chain.id + "  (" + chain.BlockNum + "-" + chain.BlockNumMax + ")")
                        chain.StopSend = true
                        chain.AddInfo("Stop load #1")
                        this.FREE_ALL_MEM_CHAINS()
                        return;
                    }
                    else
                        if(chain.BlockNumMax < min_num)
                        {
                            if(global.WATCHDOG_DEV)
                                ToLog("Timeout - stop load chain with id=" + chain.id + "  (" + chain.BlockNum + "-" + chain.BlockNumMax + ")")
                            chain.StopSend = true
                            chain.AddInfo("Stop load #2")
                            
                            this.ClearChains(chain, 0)
                        }
                }
            }
            if(chain && !chain.IsSum && !chain.StopSend)
            {
                var StrKey = "H:" + GetHexFromArr(chain.Hash);
                var Map = this.GetMapLoadedFromChain(chain);
                var WasBlock = Map[StrKey];
                if(WasBlock && WasBlock.chain !== chain && CompareArr(WasBlock.Hash, chain.Hash) === 0 && !WasBlock.chain.Deleted)
                {
                    if(global.WATCHDOG_DEV)
                        ToLog("Was hash in chain " + WasBlock.chain.id + " - stop load chain with id=" + chain.id + "  (" + chain.BlockNum + ")")
                    chain.Comment2 = "was hash"
                    chain.StopSend = true
                }
            }
            if(chain && chain.StopSend)
                CountStopSend++
            chain = this.LoadedChainList[i]
            if(chain && !chain.GetFindDB() && !chain.StopSend)
            {
                this.SendChainNext(chain, true)
            }
        }
        
        ADD_TO_STAT("MAX:LOADEDCHAINLIST", this.LoadedChainList.length)
        
        this.FREE_MEM_CHAINS(min_num_load)
        this.LastLoadedBlockNum = 0
        
        if(this.LoadedChainList.length > COUNT_HISTORY_BLOCKS_FOR_LOAD)
        {
            if(global.WATCHDOG_DEV)
                ToLog("LoadedChainList>COUNT_HISTORY_BLOCKS_FOR_LOAD -> FREE_ALL_MEM_CHAINS")
            this.FREE_ALL_MEM_CHAINS()
        }
    }
    
    GetNextNode(task, keyid, checktime, BlockNum, FTestNode, Context)
    {
        
        var CurTime = GetCurrentTime(0) - 0;
        
        if(checktime && task.time)
        {
            var Delta = CurTime - task.time;
            if(Delta < PACKET_ALIVE_PERIOD_NEXT_NODE)
                return {Result:false, timewait:true, RowNum:1};
        }
        var StartI = 0;
        if(task.Node)
            StartI =  - 1
        
        var timewait = false;
        var arr = this.GetActualNodes();
        
        PrepareBlockProcessSort(arr)
        arr.sort(SortNodeBlockProcessCountTimeAvg)
        
        if(arr.length > 40)
            arr.length = 40
        var NodeCount1 = arr.length;
        var NodeCount2 = 0;
        var NodeCount3 = 0;
        var NodeCount4 = 0;
        var NodeCount5 = 0;
        var NodeCount6 = 0;
        var NodeCount7 = 0;
        
        for(var i = StartI; i < arr.length; i++)
        {
            var Node;
            if(i ===  - 1)
            {
                Node = task.Node
                task.Node = undefined
            }
            else
            {
                this.TaskNodeIndex++
                Node = arr[this.TaskNodeIndex % arr.length]
            }
            NodeCount2++
            NodeCount3++
            
            if(FTestNode && !FTestNode(Context, Node))
                continue;
            if(Node.Active)
            {
                NodeCount4++
                
                if(!Node.INFO || !Node.INFO.WasPing || Node.StopGetBlock || (Node.INFO.CheckPointHashDB && CHECK_POINT.BlockNum && CompareArr(CHECK_POINT.Hash,
                Node.INFO.CheckPointHashDB) !== 0))
                {
                    timewait = true
                    continue;
                }
                
                NodeCount5++
                if(BlockNum !== undefined && (BlockNum < Node.BlockNumDBMin || BlockNum > Node.BlockNumDB))
                {
                    timewait = true
                    continue;
                }
                
                NodeCount6++
                if(Node.TaskLastSend)
                {
                    var Delta = CurTime - Node.TaskLastSend;
                    if(Delta < global.PERIOD_GET_BLOCK)
                    {
                        timewait = true
                        continue;
                    }
                }
                
                NodeCount7++
                
                var keysend = "" + Node.addrStr + ":" + keyid;
                if(task.MapSend[keysend])
                    continue;
                
                Node.TaskKeyID = keyid
                Node.TaskLastSend = CurTime
                task.time = CurTime
                
                return {Result:true, Node:Node, timewait:timewait, ArrStat:[NodeCount1, NodeCount2, NodeCount3, NodeCount4, NodeCount5, NodeCount6,
                    NodeCount7], RowNum:2};
            }
        }
        if(!task.RestartGetNextNode)
            task.RestartGetNextNode = 0
        if(!timewait && task.RestartGetNextNode < 3)
        {
            if(!task.LastTimeRestartGetNextNode)
                task.LastTimeRestartGetNextNode = 0
            var Delta = Date.now() - task.LastTimeRestartGetNextNode;
            if(Delta > 3000)
            {
                task.RestartGetNextNode++
                task.LastTimeRestartGetNextNode = Date.now()
                task.MapSend = {}
                return {Result:false, timewait:true, RowNum:3};
            }
        }
        
        return {Result:false, timewait:timewait, RowNum:4};
    }
    
    SendChainNext(chain, checktime)
    {
        var Ret = this.GetNextNode(chain, chain.BlockNum, checktime, chain.BlockNum);
        if(Ret.Result)
        {
            if(!chain.Context)
                chain.Context = {Chain:chain}
            
            var Node = Ret.Node;
            this.SendF(Node, {"Method":"GETBLOCKHEADER", "Context":chain.Context, "Data":{Foward:0, BlockNum:chain.BlockNum, Hash:chain.Hash,
                    IsSum:chain.IsSum, Count:chain.Count}})
            
            var DopStr = "";
            if(chain.IsSum)
                DopStr = "SUM:"
            chain.AddInfo(chain.BlockNum + "/" + DopStr + this.GetStrFromHashShort(chain.Hash) + "->" + GetNodeStrPort(Node))
            
            return true;
        }
        return false;
    }
    static
    GETBLOCKHEADER_F()
    {
        return "{\
                Foward:byte,\
                BlockNum:uint,\
                Hash:hash,\
                Count:uint,\
                IsSum:byte\
            }";
    }
    static
    GETBLOCKHEADER100_F()
    {
        return "{\
                BlockNum:uint,\
                Hash:hash,\
                Count:uint\
            }";
    }
    
    GetBlockArrFromBuffer_Load(BufRead, Info)
    {
        var BlockArr = GetBlockArrFromBuffer(BufRead, Info);
        if(BlockArr.length > 0 && BlockArr[0].BlockNum === BLOCK_PROCESSING_LENGTH2)
            BlockArr.unshift(this.ReadBlockHeaderDB(BLOCK_PROCESSING_LENGTH2 - 1))
        return BlockArr;
    }
    
    RETBLOCKHEADER_FOWARD(Info)
    {
        if(!Info.Context.Foward)
            return 0;
        
        var Context = Info.Context;
        
        Context.time = undefined
        var BufRead = BufLib.GetReadBuffer(Info.Data);
        var arr = this.GetBlockArrFromBuffer_Load(BufRead, Info);
        
        var arr2 = [];
        var bFindDB = 0;
        if(arr.length > 1 && arr[0].BlockNum === Context.BlockNum)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var Block = arr[i];
                if(!Block)
                    return 0;
                
                if(Block.BlockNum === CHECK_POINT.BlockNum && !IsZeroArr(CHECK_POINT.Hash))
                {
                    if(CompareArr(CHECK_POINT.Hash, Block.Hash) !== 0)
                    {
                        break;
                    }
                    Context.FindCheckPoint = true
                }
                
                if(!bFindDB)
                {
                    var BlockDB = this.ReadBlockHeaderDB(Block.BlockNum);
                    if(BlockDB && CompareArr(BlockDB.SumHash, Block.SumHash) === 0)
                    {
                        bFindDB = 1
                        arr2.push(Block)
                    }
                    else
                        if(BlockDB && IsZeroArr(BlockDB.SumHash))
                        {
                            bFindDB = 1
                            arr2.push(Block)
                        }
                }
                else
                    if(bFindDB)
                    {
                        arr2.push(Block)
                    }
            }
        }
        
        if(arr2.length > 1)
        {
            var Node = Info.Node;
            
            Context.WasLoadNum = 1
            var chain = {id:0, StopSend:1, WriteToDBAfterLoad:1};
            this.ChainBindMethods(chain)
            
            this.SetChainNum(chain)
            this.PrepareTransactionsForLoad(chain, arr2)
            Context.BlockNum = Block.BlockNum
            Context.Pause = 1
            
            return 1;
        }
        else
        {
            {
                var keysend = "" + Info.Node.addrStr + ":" + Context.BlockNum;
                Context.MapSend[keysend] = 1
            }
        }
        
        return 0;
    }
    
    RETBLOCKHEADER(Info, CurTime)
    {
        Info.Node.NextPing = MIN_PERIOD_PING
        
        if(Info.Context.Foward)
            return this.RETBLOCKHEADER_FOWARD(Info, CurTime);
        
        var chain = Info.Context.Chain;
        if(chain && !chain.StopSend && !chain.Deleted)
        {
            var BufRead = BufLib.GetReadBuffer(Info.Data);
            chain.time = undefined
            var arr = this.GetBlockArrFromBuffer_Load(BufRead, Info);
            if(arr.length <= 1)
            {
                var keysend = "" + Info.Node.addrStr + ":" + chain.BlockNum;
                chain.MapSend[keysend] = 1
                chain.AddInfo("NO:" + GetNodeStrPort(Info.Node))
                return;
            }
            chain.AddInfo("L=" + arr.length + " from:" + GetNodeStrPort(Info.Node))
            
            var NextLoadBlock;
            var PrevBlock;
            for(var i = arr.length - 1; i >= 0; i--)
            {
                var Block = arr[i];
                
                var StrKey = GetHexFromArr(Block.SumHash);
                var MapBlockLoaded = this.GetMapLoaded(Block.BlockNum);
                
                var BlockFind = MapBlockLoaded[StrKey];
                if(BlockFind && BlockFind.chain !== chain && BlockFind.chain.Deleted)
                {
                    delete MapBlockLoaded[StrKey]
                    BlockFind = undefined
                }
                
                if(!chain.BlockHead)
                    chain.BlockHead = Block
                if(!chain.BlockNumMax)
                    chain.BlockNumMax = Block.BlockNum
                
                var PrevBlock0 = PrevBlock;
                
                if(BlockFind)
                {
                    if(PrevBlock)
                    {
                        PrevBlock.BlockDown = BlockFind
                        PrevBlock.Send = undefined
                    }
                    PrevBlock = BlockFind
                }
                else
                {
                    if(PrevBlock)
                    {
                        PrevBlock.BlockDown = Block
                        PrevBlock.Send = undefined
                    }
                    PrevBlock = Block
                }
                
                if(BlockFind && BlockFind.chain !== chain)
                {
                    
                    chain.ParentChain = BlockFind.chain
                    chain.RootChain = BlockFind.chain.GetRootChain()
                    if(chain.RootChain)
                        chain.RootChain.BlockNumMax = chain.BlockHead.BlockNum
                    
                    chain.StopSend = true
                    chain.AddInfo("StopSend - Find load Block")
                    
                    break;
                }
                else
                    if(!BlockFind)
                    {
                        Block.chain = chain
                        
                        Block.Node = Info.Node
                        var StrSumHash = GetHexFromArr(Block.SumHash);
                        MapBlockLoaded[StrSumHash] = Block
                        var StrHash = GetHexFromArr(Block.Hash);
                        MapBlockLoaded["H:" + StrHash] = Block
                        var StrTreeHash = GetHexFromArr(Block.TreeHash);
                        MapBlockLoaded["TH:" + StrTreeHash] = Block
                        
                        var BlockDB = this.ReadBlockHeaderDB(Block.BlockNum);
                        if(BlockDB)
                        {
                            Block.Power = GetPowPower(Block.PowHash)
                            chain.LoadCountDB++
                            chain.LoadSumDB += BlockDB.Power
                            chain.LoadSum += Block.Power
                            
                            if(CompareArr(BlockDB.SumHash, Block.SumHash) === 0)
                            {
                                Block.FindBlockDB = true
                                Block.SumPow = BlockDB.SumPow
                                
                                chain.FindBlockDB = true
                                chain.StopSend = true
                                chain.AddInfo("BlockFind - Find Block in DB")
                                
                                NextLoadBlock = undefined
                                break;
                            }
                        }
                        
                        NextLoadBlock = Block
                    }
            }
            
            if(NextLoadBlock && !NextLoadBlock.chain.StopSend)
            {
                if(arr.length >= chain.Count)
                {
                    chain.Count = chain.Count * 2
                    if(chain.Count > COUNT_BLOCKS_FOR_LOAD)
                        chain.Count = COUNT_BLOCKS_FOR_LOAD
                }
                
                if(chain.LoadCountDB >= COUNT_BLOCKS_FOR_CHECK_POW)
                {
                    if(chain.LoadSumDB - chain.LoadSum > MAX_DELTA_COUNT_SUM_FOR_LOAD)
                    {
                        var Str = "ERR LOADED SUM POW chains: SumDB > Sum loaded from: " + NodeInfo(Info.Node);
                        chain.StopSend = true
                        chain.AddInfo(Str)
                    }
                }
                
                if(!chain.StopSend)
                    this.BlockChainLoad(NextLoadBlock)
            }
            
            if(chain.GetFindDB())
                this.CheckToStartLoadBlockData(chain)
        }
    }
    
    BlockChainLoad(Block)
    {
        var chain = Block.chain;
        Block.Send = undefined
        
        chain.BlockNum = Block.BlockNum
        chain.Hash = Block.SumHash
        chain.IsSum = true
        
        chain.StopSend = false
        chain.FindBlockDB = false
        chain.RootChain = undefined
        chain.ParentChain = undefined
        
        chain.AddInfo("SetChainSend:" + chain.BlockNum)
    }
    
    CheckToStartLoadBlockData(chain)
    {
        if(chain.Deleted)
            return;
        
        var arr = this.GetArrFromChain(chain);
        if(arr.length < 2)
            return;
        
        var BlockMax = arr[arr.length - 1];
        var BlockMin = arr[0];
        var PrevBlock = BlockMin;
        for(var i = 1; i < arr.length; i++)
        {
            var Block = arr[i];
            Block.Power = GetPowPower(Block.PowHash)
            Block.SumPow = PrevBlock.SumPow + Block.Power
            PrevBlock = Block
        }
        var BlockNow = this.ReadBlockHeaderDB(BlockMax.BlockNum);
        if(BlockNow && (BlockMax.SumPow < BlockNow.SumPow || BlockMax.SumPow === BlockNow.SumPow && CompareArr(BlockMax.PowHash, BlockNow.PowHash) < 0))
        {
            var Str = "Low SumPow";
            chain.AddInfo(Str)
            return;
        }
        
        var Str = "Start Load blocks: " + (BlockMin.BlockNum + 1) + "  -  " + BlockMax.BlockNum;
        chain.AddInfo(Str)
        this.PrepareTransactionsForLoad(chain, arr)
    }
    
    GetArrFromChain(chain)
    {
        var arr = [];
        var Block = chain.BlockHead;
        while(Block)
        {
            arr.unshift(Block)
            if(Block.AddToLoad || Block.FindBlockDB || Block.LoadDBFinaly)
            {
                break;
            }
            
            Block = Block.BlockDown
        }
        return arr;
    }
    
    PrepareTransactionsForLoad(chain, arr, bNoSlice)
    {
        if(!bNoSlice)
            arr = arr.slice(1)
        
        chain.arr = arr
        if(arr.length > 0)
        {
            for(var i = 0; i < arr.length; i++)
            {
                arr[i].AddToLoad = 1
            }
            
            chain.CurNumArrLoad = 0
        }
    }
    
    LoopBlockLoad()
    {
        if(glStopNode)
            return;
        
        var CountSend = 0;
        for(var num = 0; num < this.LoadedChainList.length; num++)
        {
            var chain = this.LoadedChainList[num];
            if(chain && chain.arr && chain.arr.length && chain.StopSend)
            {
                var Count = 0;
                for(var i = chain.CurNumArrLoad; i < chain.arr.length; i++)
                {
                    Count++
                    
                    var Block = chain.arr[i];
                    if(!IsZeroArr(Block.TreeHash) && !Block.TreeEq && !Block.LoadDBFinaly)
                    {
                        if(!Block.MapSend)
                        {
                            if(!Block.BodyLoad)
                            {
                                var BlockDB = this.ReadBlockHeaderDB(Block.BlockNum);
                                if(BlockDB)
                                {
                                    if(CompareArr(BlockDB.TreeHash, Block.TreeHash) == 0)
                                    {
                                        Block.TreeEq = true
                                        Block.Reserv500 = BlockDB.Reserv500
                                        Block.TrDataPos = BlockDB.TrDataPos
                                        Block.TrDataLen = BlockDB.TrDataLen
                                        continue;
                                    }
                                }
                            }
                            
                            Block.MapSend = {}
                        }
                        
                        if(this.SendBlockNext(Block))
                        {
                            CountSend++
                            if(CountSend >= MAX_BLOCK_SEND)
                                return;
                        }
                    }
                    else
                        if(i === chain.CurNumArrLoad)
                        {
                            chain.CurNumArrLoad++
                            Block.LoadDBFinaly = true
                            Count = 0
                        }
                }
                
                this.CheckAndWriteLoadedChain(chain)
            }
        }
    }
    
    CheckAndWriteLoadedChain(chain)
    {
        if(chain.CurNumArrLoad >= chain.arr.length)
        {
            var Block = chain.arr[chain.arr.length - 1];
            
            if(chain.WriteToDBAfterLoad || Block.BlockNum >= this.CurrentBlockNum + TIME_START_SAVE - 2)
            {
                var bAllLoaded = true;
                if(!chain.WriteToDBAfterLoad)
                {
                    var cur_parent = chain.ParentChain;
                    while(cur_parent)
                    {
                        if(cur_parent.arr && cur_parent.CurNumArrLoad < cur_parent.arr.length)
                        {
                            bAllLoaded = false
                            break;
                        }
                        
                        cur_parent = cur_parent.ParentChain
                    }
                }
                
                if(bAllLoaded)
                {
                    var arr = [];
                    var cur_chain = chain;
                    while(cur_chain)
                    {
                        if(cur_chain.arr)
                            for(var i = cur_chain.arr.length - 1; i >= 0; i--)
                            {
                                var Block = cur_chain.arr[i];
                                arr.unshift(Block)
                            }
                        cur_chain = cur_chain.ParentChain
                    }
                    this.WriteLoadedBlockArr(arr)
                }
            }
        }
    }
    
    WriteLoadedBlockArr(arr)
    {
        if(!arr.length)
            return;
        
        var startTime = process.hrtime();
        
        var CurrentBlockNum = GetCurrentBlockNumByTime();
        var CountBlockWithTx = 0;
        var Block, FirstBlock;
        for(var i = 0; i < arr.length; i++)
        {
            Block = arr[i]
            if(Block.BlockNum > this.BlockNumDB + 1)
                break;
            
            if(!FirstBlock)
                FirstBlock = Block
            Block.BlockDown = undefined
            if(Block.BlockNum > this.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2)
            {
                var PrevHash = this.GetLinkHashDB(Block);
                if(CompareArr(PrevHash, Block.PrevHash) !== 0)
                {
                    if(global.WATCHDOG_DEV)
                        ToError("******** ERROR LOADED DATA Count:" + arr.length + "  AT BLOCK NUM:" + Block.BlockNum + "  (" + arr[0].BlockNum + "-" + arr[arr.length - 1].BlockNum + ")")
                    this.FREE_ALL_MEM_CHAINS()
                    return;
                }
            }
            var Res = 0;
            if(Block.TreeEq)
            {
                CountBlockWithTx++
                this.ReadBlockBodyDB(Block)
                Res = this.WriteBlockDBFinaly(Block)
            }
            else
            {
                if(IsZeroArr(Block.TreeHash))
                {
                    Res = this.WriteBlockDB(Block)
                }
                else
                {
                    ToLogTrace("IsZeroArr(Block.TreeHash)")
                    this.FREE_ALL_MEM_CHAINS()
                    return;
                }
            }
            if(!Res)
            {
                ToLog("ERROR WRITE DB, NUM=" + Block.BlockNum)
                this.FREE_ALL_MEM_CHAINS()
                return;
            }
            Block.LoadDB = true
            
            if(Block.BlockNum >= CurrentBlockNum - BLOCK_COUNT_IN_MEMORY)
            {
                this.CopyBlockToMem(Block)
            }
            else
            {
                if(Block.arrContent)
                    Block.arrContent.length = 0
                Block.arrContent = undefined
            }
            
            var BlockMem = this.BlockChain[Block.BlockNum];
            if(BlockMem)
            {
                AddInfoBlock(BlockMem, "LOAD:" + GetPowPower(Block.PowHash) + " TH:" + this.GetStrFromHashShort(Block.TreeHash).substr(0, 4))
            }
        }
        if(Block && FirstBlock && Block.BlockNum > CurrentBlockNum - 1000)
        {
            var CurNumStart = Math.max(FirstBlock.BlockNum + 8, Block.BlockNum + 1);
            this.SetNoPOW(CurNumStart, 1, FirstBlock.BlockNum)
        }
        
        this.FREE_ALL_MEM_CHAINS()
        ADD_TO_STAT_TIME("WRITECHAIN_TO_DB_TIME", startTime)
        
        if(this.LoadHistoryMessage)
            ToLog("WRITE DATA Count:" + arr.length + "  " + arr[0].BlockNum + "-" + arr[arr.length - 1].BlockNum + "  TxBlocks:" + CountBlockWithTx,
            2)
    }
    
    CopyBlock(Block, BlockDst)
    {
        BlockDst.BlockNum = Block.BlockNum
        BlockDst.TreeHash = Block.TreeHash
        BlockDst.AddrHash = Block.AddrHash
        BlockDst.PrevHash = Block.PrevHash
        BlockDst.SumHash = Block.SumHash
        
        BlockDst.SumPow = Block.SumPow
        BlockDst.TrDataPos = Block.TrDataPos
        BlockDst.TrDataLen = Block.TrDataLen
        BlockDst.SeqHash = Block.SeqHash
        BlockDst.Hash = Block.Hash
        BlockDst.PowHash = Block.PowHash
        BlockDst.TrCount = Block.TrCount
        BlockDst.arrContent = Block.arrContent
        
        BlockDst.bSave = Block.bSave
    }
    
    CopyBlockToMem(Block)
    {
        var BlockMem = this.BlockChain[Block.BlockNum];
        if(BlockMem)
        {
            this.CopyBlock(Block, BlockMem)
            BlockMem.Prepared = true
            BlockMem.MinTrPow = undefined
            this.RecreateMaxPOW(BlockMem)
        }
        this.AddToStatBlockConfirmation(Block)
    }
    
    ClearMaxInBlock(Block)
    {
        Block.MaxPOW = {}
        var POW = Block.MaxPOW;
        POW.SeqHash = Block.SeqHash
        POW.AddrHash = Block.AddrHash
        POW.PrevHash = Block.PrevHash
        POW.TreeHash = Block.TreeHash
        POW.Hash = Block.Hash
        POW.PowHash = Block.PowHash
        POW.SumPow = Block.SumPow
        
        Block.MaxSum = {}
        POW = Block.MaxSum
        POW.SeqHash = Block.SeqHash
        POW.AddrHash = Block.AddrHash
        POW.PrevHash = Block.PrevHash
        POW.TreeHash = Block.TreeHash
        POW.Hash = Block.Hash
        POW.PowHash = Block.PowHash
        POW.SumHash = Block.SumHash
        POW.SumPow = Block.SumPow
    }
    
    AddToStatBlockConfirmation(Block)
    {
        if(Block.BlockNum > START_BLOCK_RUN + BLOCK_PROCESSING_LENGTH2)
        {
            var TimeDelta = this.CurrentBlockNum - Block.BlockNum;
            ADD_TO_STAT("MAX:BlockConfirmation", TimeDelta)
        }
        else
        {
            ADD_TO_STAT("MAX:BlockConfirmation", BLOCK_PROCESSING_LENGTH)
        }
    }
    
    SendBlockNext(Block)
    {
        var SendResult = 0;
        var Key = GetHexFromArr(Block.TreeHash);
        
        var Ret = this.GetNextNode(Block, Key, true, Block.BlockNum);
        if(Ret.Result)
        {
            var Node = Ret.Node;
            
            var StrStat = Ret.ArrStat.join(",");
            ToLog("SEND GETBLOCK: " + Block.BlockNum + " to " + NodeName(Node) + " atime=" + Node.DeltaTimeAvg + " STAT:" + StrStat, 6)
            
            if(!Block.Context)
                Block.Context = {Block:Block}
            this.SendF(Node, {"Method":"GETBLOCK", "Context":Block.Context, "Data":{BlockNum:Block.BlockNum, TreeHash:Block.TreeHash}})
            Node.SendBlockCount++
            SendResult = 1
            
            let SELF = this;
            Node.DeltaTimeAvg += 1000
            Block.Context.F = function (Info)
            {
                var Node = Info.Node;
                
                var Result = SELF.RETGETBLOCK(Info);
                
                if(Result)
                {
                    if(Node.LastDeltaTime <= global.PERIOD_GET_BLOCK)
                        Node.BlockProcessCount += 2
                    else
                        if(Node.LastDeltaTime <= 2 * global.PERIOD_GET_BLOCK)
                            Node.BlockProcessCount += 1
                        else
                            Node.BlockProcessCount += 0
                    ToLog("BLOCK_LOADED: " + Block.BlockNum + " from " + NodeName(Node) + " ltime=" + Node.LastDeltaTime, 5)
                }
                else
                {
                    Node.DeltaTimeAvg += 1000
                    var DeltaScore = Math.floor(Node.BlockProcessCount / 50);
                    if(!DeltaScore || DeltaScore < 2)
                        DeltaScore = 2
                    Node.BlockProcessCount = Node.BlockProcessCount - DeltaScore
                    SELF.CheckBlockProcess(Node, "")
                }
            }
            
            AddInfoBlock(Block, "SendNext")
            
            if(Block.chain)
                Block.chain.AddInfo("QUERY BL:" + Block.BlockNum + "/" + this.GetStrFromHashShort(Block.TreeHash) + " TO:" + GetNodeStrPort(Node))
        }
        else
        {
            if(!Ret.timewait)
            {
                this.ClearChains(Block.chain, true)
            }
        }
        
        return SendResult;
    }
    ClearChains(DeleteChain, bShow)
    {
        if(!DeleteChain)
        {
            this.FREE_ALL_MEM_CHAINS()
            return this.LoadedChainList.length;
        }
        var allsum = this.LoadedChainList.length;
        
        var Sum = 0;
        for(var i = 0; i < this.LoadedChainList.length; i++)
        {
            var chain = this.LoadedChainList[i];
            if(chain)
            {
                if(chain === DeleteChain)
                {
                    chain.Deleted = true
                    this.LoadedChainList[i] = undefined
                    Sum++
                }
                if(chain.ParentChain === DeleteChain)
                {
                    Sum += this.ClearChains(chain)
                }
            }
        }
        
        if(bShow)
        {
            ToLog("===========ClearChains================= " + DeleteChain.id + " count=" + Sum + "/" + allsum)
        }
        
        return Sum;
    }
    
    RecalcLoadBlockStatictic()
    {
        return;
        
        var TimeNum = Math.floor(Date.now() / STAT_BLOCK_LOAD_PERIOD);
        if(this.LoadBlockStatNum === TimeNum)
            return;
        this.LoadBlockStatNum = TimeNum
        
        const PeriodSec = 5;
        const Period = CONSENSUS_PERIOD_TIME / STAT_BLOCK_LOAD_PERIOD;
        const PeriodCount = PeriodSec * Period;
        
        var FreeGet = 64;
        var it = this.ActualNodes.iterator(), Node;
        while((Node = it.next()) !== null)
        {
            var arr = Node.SendBlockArr;
            arr.push(Node.SendBlockCount)
            if(arr.length > PeriodCount)
            {
                arr.shift()
            }
            
            arr = Node.LoadBlockArr
            arr.push(Node.LoadBlockCount)
            if(arr.length > PeriodCount)
            {
                arr.shift()
            }
            
            var SendPackets = 0;
            var LoadPackets = 0;
            for(var i = 0; i < Node.SendBlockArr.length; i++)
                SendPackets += Node.SendBlockArr[i]
            for(var i = 0; i < Node.LoadBlockArr.length; i++)
                LoadPackets += Node.LoadBlockArr[i]
            
            Node.SendBlockCountAll = SendPackets
            Node.LoadBlockCountAll = LoadPackets
            
            var Nuts = Math.floor(LoadPackets / PeriodSec);
            var RestPackets = SendPackets - LoadPackets;
            var CountGet = 1 + Math.floor(Math.max(0, (Nuts - RestPackets / Period)));
            Node.CanGetBlocks = Math.min(FreeGet, CountGet)
            FreeGet -= Node.CanGetBlocks
            Node.SendBlockCount = 0
            Node.LoadBlockCount = 0
            
            ADD_TO_STAT("NODE_CAN_GET:" + NodeName(Node), Node.CanGetBlocks, 1)
        }
    }
    
    static
    
    GETBLOCK_F()
    {
        return "{\
                    BlockNum:uint,\
                    TreeHash:hash,\
                }";
    }
    
    RETGETBLOCK(Info)
    {
        Info.Node.NextPing = MIN_PERIOD_PING
        
        var Block = Info.Context.Block;
        
        if(Block && !Block.TreeEq)
        {
            var Data = BufLib.GetObjectFromBuffer(Info.Data, FORMAT_BLOCK_TRANSFER, WRK_BLOCK_TRANSFER);
            Info.Data = undefined
            
            if(Data.BlockNum !== Block.BlockNum || CompareArr(Data.TreeHash, Block.TreeHash) !== 0)
            {
                this.SetBlockNOSendToNode(Block, Info.Node, "NO")
                return 0;
            }
            
            if(Block.chain)
            {
                Block.chain.AddInfo("Load TR:" + Data.BlockNum + "/" + this.GetStrFromHashShort(Data.TreeHash) + " from:" + GetNodeStrPort(Info.Node))
                AddInfoBlock(Block, "LOAD TR OK")
            }
            
            var arrContent = Data.arrContent;
            
            var TreeHash = CalcTreeHashFromArrBody(Block.BlockNum, arrContent);
            if(CompareArr(Block.TreeHash, TreeHash) !== 0)
            {
                ToLog("2. BAD CMP TreeHash block=" + Block.BlockNum + " from:" + NodeName(Info.Node) + "  TreeHash=" + GetHexFromArr(TreeHash) + "  BlockTreeHash=" + GetHexFromArr(Block.TreeHash))
                this.SetBlockNOSendToNode(Block, Info.Node, "BAD CMP TreeHash")
                return 0;
            }
            if(Data.BlockNum >= START_BAD_ACCOUNT_CONTROL && arrContent.length > 0 && Data.BlockNum % PERIOD_ACCOUNT_HASH === 0)
            {
                var TR = arrContent[0];
                if(TR[0] === TYPE_TRANSACTION_ACC_HASH)
                {
                    if(!DApps.Accounts.TRCheckAccountHash(TR, Data.BlockNum))
                    {
                        if(!this.BADHashCount)
                            this.BADHashCount = 0
                        this.BADHashCount++
                        
                        ToLog("**** BAD ACCOUNT Hash in block=" + Block.BlockNum + " from:" + NodeName(Info.Node) + " ****")
                        ToLog("May be need to Rewrite transactions from: " + (Block.BlockNum - 2 * DELTA_BLOCK_ACCOUNT_HASH))
                        this.SetBlockNOSendToNode(Block, Info.Node, "BAD CMP ACC HASH")
                        if(global.WATCHDOG_BADACCOUNT && this.BADHashCount > 60)
                        {
                            ToLog("Run WATCHDOG!")
                            this.BADHashCount = 0
                            this.FREE_ALL_MEM_CHAINS()
                            this.SetTruncateBlockDB(Block.BlockNum - 5 * DELTA_BLOCK_ACCOUNT_HASH)
                        }
                        else
                        {
                        }
                        return 0;
                    }
                }
            }
            Block.arrContent = arrContent
            var Ret = this.WriteBodyDB(Block);
            Block.TrCount = 0
            Block.arrContent.length = 0
            Block.arrContent = undefined
            
            if(!Ret)
            {
                this.SetBlockNOSendToNode(Block, Info.Node, "Error write")
                return 0;
            }
            Block.TreeEq = true
            delete Block.Send
            
            ADD_TO_STAT("BLOCK_LOADED", 1)
            
            Info.Node.LoadBlockCount++
            
            if(GrayConnect())
                Info.Node.BlockProcessCount++
            
            if(this.LoadHistoryMode)
            {
                var Context = this.LoadHistoryContext;
                Context.PrevBlockNum = Context.BlockNum
                Context.StartTimeHistory = Date.now()
            }
            
            return 1;
        }
        return 0;
    }
    
    SetBlockNOSendToNode(Block, Node, Str)
    {
        var Str = GetHexFromArr(Block.TreeHash);
        var Str2 = this.GetStrFromHashShort(Block.TreeHash);
        var keysend = "" + Node.addrStr + ":" + Str;
        Block.MapSend[keysend] = 1
        if(Block.chain)
            Block.chain.AddInfo("" + Block.BlockNum + " " + Str2 + "<-" + GetNodeStrPort(Node))
    }
    
    FindBlockInLoadedChain(BlockNum, TreeHash)
    {
        var StrTreeHash = GetHexFromArr(TreeHash);
        var MapBlockLoaded = this.GetMapLoaded(BlockNum);
        var BlockFind = MapBlockLoaded["TH:" + StrTreeHash];
        if(BlockFind && BlockFind.TreeEq)
            return BlockFind;
        else
            return undefined;
    }
    
    CheckSeqHashDB(Block, StrError)
    {
        if(Block.BlockNum < BLOCK_PROCESSING_LENGTH2)
            return true;
        
        var TreeHashTest = CalcTreeHashFromArrBody(Block.BlockNum, Block.arrContent);
        if(CompareArr(TreeHashTest, Block.TreeHash) !== 0)
        {
            var StrHex = GetHexFromArr(TreeHashTest);
            var StrHex0 = GetHexFromArr(Block.TreeHash);
            var Str = StrError + " #3 ERROR TREEHASH: " + Block.BlockNum + "  Hex:" + StrHex0.substr(0, 12) + " != " + StrHex.substr(0,
            12);
            if(global.WATCHDOG_DEV)
                ToLogTrace(Str)
            else
                ToError(Str)
            return false;
        }
        
        var PrevHash = this.GetLinkHashDB(Block);
        if(CompareArr(PrevHash, Block.PrevHash) !== 0)
        {
            var Str = StrError + " #2 ERROR PrevHash - block num: " + Block.BlockNum + "  " + GetHexFromArr(Block.PrevHash) + "/" + GetHexFromArr(PrevHash);
            ToLogTrace(Str)
            return false;
        }
        
        var testSeqHash = GetSeqHash(Block.BlockNum, PrevHash, Block.TreeHash);
        
        var TestValue = GetHashFromSeqAddr(testSeqHash, Block.AddrHash, Block.BlockNum, PrevHash);
        
        if(CompareArr(TestValue.Hash, Block.Hash) !== 0)
        {
            var Str = StrError + " #2 ERROR HASH - block num: " + Block.BlockNum + "  " + GetHexFromArr(Block.Hash) + "/" + GetHexFromArr(TestValue.Hash);
            if(global.WATCHDOG_DEV)
                ToLogTrace(Str)
            else
                ToError(Str)
            return false;
        }
        
        return true;
    }
    
    ToLogBlock(Block, StrInfo, arr)
    {
        ToLog("-------------" + StrInfo)
        ToLog("BlockNum=" + (Block.BlockNum))
        ToLog("Hash=" + GetHexFromArr(Block.Hash))
        ToLog("SeqHash=" + GetHexFromArr(Block.SeqHash))
        ToLog("PrevHash=" + GetHexFromArr(Block.PrevHash))
        ToLog("TreeHash=" + GetHexFromArr(Block.TreeHash))
        ToLog("AddrHash=" + GetHexFromArr(Block.AddrHash))
        ToLog("SumHash=" + GetHexFromArr(Block.SumHash))
        ToLog("SumPow=" + Block.SumPow)
        
        for(var i = 0; i < arr.length; i++)
        {
            ToLog("arr[" + i + "]=" + GetHexFromArr(arr[i]))
        }
    }
    
    GetBlock(num, bToMem, bReadBody)
    {
        if(bToMem === undefined)
            bToMem = true
        
        if(num < this.CurrentBlockNum - BLOCK_COUNT_IN_MEMORY)
            bToMem = false
        
        var Block = this.BlockChain[num];
        if(!Block)
        {
            if(bReadBody)
                Block = this.ReadBlockDB(num)
            else
                Block = this.ReadBlockHeaderDB(num)
            
            if(bToMem)
            {
                this.BlockChain[num] = Block
            }
        }
        return Block;
    }
    
    GetMapLoaded(num)
    {
        if(num < 0)
            num = 0
        var index = Math.floor(num / BLOCK_COUNT_IN_MEMORY);
        
        var map = this.MapMapLoaded[index];
        if(!map)
        {
            map = {}
            this.MapMapLoaded[index] = map
        }
        
        return map;
    }
    GetMapLoadedFromChain(chain)
    {
        return this.GetMapLoaded(chain.BlockNumStart);
    }
    
    FREE_MEM_BLOCKS(NumMax)
    {
        for(var key in this.BlockChain)
        {
            var Block = this.BlockChain[key];
            if(!Block || Block.BlockNum < NumMax)
            {
                delete this.BlockChain[key]
            }
        }
    }
    FREE_MEM_CHAINS(NumMax)
    {
        this.FREE_MEM_BLOCKS(NumMax - BLOCK_COUNT_IN_MEMORY)
        
        var maxArrMap = Math.floor(NumMax / BLOCK_COUNT_IN_MEMORY) - 1;
        if(maxArrMap >= 0)
        {
            var nWasCount = 0;
            for(var key in this.MapMapLoaded)
                if(key < maxArrMap)
                {
                    nWasCount++
                    delete this.MapMapLoaded[key]
                }
        }
    }
    FREE_ALL_MEM_CHAINS()
    {
        
        this.FREE_MEM_BLOCKS(this.BlockNumDB - BLOCK_COUNT_IN_MEMORY)
        
        for(var i = 0; i < this.LoadedChainList.length; i++)
        {
            var chain = this.LoadedChainList[i];
            if(chain)
            {
                chain.Deleted = true
                chain.ChainMax = undefined
            }
        }
        
        if(!this.LoadHistoryMode)
        {
            this.AddValueToHistory("LoadedChainList", this.LoadedChainList)
            this.AddValueToHistory("MapMapLoaded", this.MapMapLoaded)
        }
        
        this.LoadedChainList = []
        this.MapMapLoaded = {}
        
        if(typeof gc === "function")
            gc()
    }
    
    AddValueToHistory(typedata, val)
    {
        var Arr = global.HistoryBlockBuf.LoadValue(typedata, 1);
        if(!Arr)
        {
            Arr = []
            global.HistoryBlockBuf.SaveValue(typedata, Arr)
        }
        Arr.push(val)
    }
    
    GetHistoryTree(typedata)
    {
        var Tree = global.HistoryBlockBuf.LoadValue(typedata, 1);
        if(!Tree)
        {
            Tree = new RBTree(CompareItemHash)
            global.HistoryBlockBuf.SaveValue(typedata, Tree)
        }
        return Tree;
    }
    
    ChainBindMethods(chain)
    {
        function GetRootChain()
        {
            var Count = 0;
            var root_chain = this;
            while(root_chain.RootChain)
            {
                Count++
                root_chain = root_chain.RootChain
                if(Count > MAX_COUNT_CHAIN_LOAD)
                {
                    TO_ERROR_LOG("BLOCK", 10, "Error COUNT GetRootChain")
                    SERVER.FREE_ALL_MEM_CHAINS()
                    return undefined;
                }
            }
            return root_chain;
        };
        function GetFindDB()
        {
            var Root = this.GetRootChain();
            if(Root)
                return Root.FindBlockDB;
            else
                return false;
        };
        
        chain.GetRootChain = GetRootChain.bind(chain)
        chain.GetFindDB = GetFindDB.bind(chain)
        chain.AddInfo = AddInfoChain.bind(chain)
    }
    GetMemoryStamp(Str)
    {
        return Str + ":##:" + Math.floor(this.CurrentBlockNum / BLOCK_COUNT_IN_MEMORY);
    }
    
    GetStrFromHashShort(Hash)
    {
        var Str = GetHexFromArr(Hash);
        if(typeof Str === "string")
            return Str.substr(0, 6);
        else
            return "";
    }
    
    ToLogTime(startTime, Str)
    {
        const Time = process.hrtime(startTime);
        var deltaTime = (Time[0] * 1000 + Time[1] / 1e6);
        ToLog(Str + " : " + deltaTime + "ms")
    }
    AddBlockToLoadBody(Block)
    {
        if(!this.MapBlockBodyLoad[Block.BlockNum])
        {
            this.MapBlockBodyLoad[Block.BlockNum] = Block
        }
    }
    LoopBlockBodyLoad()
    {
        var arr = [];
        for(var key in this.MapBlockBodyLoad)
        {
            var Block = this.MapBlockBodyLoad[key];
            if(!Block.BodyLoad)
            {
                Block.BodyLoad = 1
                arr.push(Block)
            }
        }
        this.MapBlockBodyLoad = {}
        if(!arr.length)
            return;
        
        var chain = {StopSend:1, WriteToDBAfterLoad:1, BodyLoad:1};
        this.ChainBindMethods(chain)
        this.SetChainNum(chain)
        this.PrepareTransactionsForLoad(chain, arr, 1)
    }
    CheckForBotNet(Node)
    {
        let DeltaScore = Math.floor(Node.BlockProcessCount / 20);
        if(DeltaScore < 5)
            DeltaScore = 5
        var DeltaNode = Node.BlockNumDB - Node.BlockNumDBMin;
        if(DeltaNode < 10000)
        {
            ToLog("BAD DeltaDB  " + NodeName(Node), 3)
            Node.BlockProcessCount -= DeltaScore
            return;
        }
        var DeltaDB = this.BlockNumDB - this.BlockNumDBMin;
        var Margin = 1000;
        var Delta = Math.min(DeltaNode, DeltaDB) - Margin;
        if(DeltaDB <= 0)
            return;
        var BlockNum = this.BlockNumDB - random(Delta) - Margin;
        var BlockDB = this.ReadBlockHeaderDB(BlockNum);
        if(!BlockDB)
        {
            return;
        }
        this.CheckBlockProcess(Node, "CheckBotNet")
        Node.BlockProcessCount -= DeltaScore
        
        let SELF = this;
        this.SendF(Node, {"Method":"GETBLOCKHEADER", "Data":{Foward:0, BlockNum:BlockNum, Hash:BlockDB.SumHash, IsSum:1, Count:1},
            "Context":{F:function (Info)
                {
                    var arr;
                    if(Info.Data.length > 10)
                    {
                        var BufRead = BufLib.GetReadBuffer(Info.Data);
                        arr = SELF.GetBlockArrFromBuffer_Load(BufRead, Info)
                    }
                    if(arr && arr.length === 1 && CompareArr(arr[0].Hash, BlockDB.Hash) === 0)
                    {
                        ToLog("WAS HL Random Block: " + BlockNum + "  from " + NodeName(Info.Node) + " arr=" + arr.length, 5)
                        Node.BlockProcessCount += DeltaScore + 2
                    }
                    else
                    {
                        ToLog("NOT WAS HL Random Block: " + BlockNum + "  from " + NodeName(Info.Node) + " Data.length=" + Info.Data.length, 3)
                    }
                }}})
    }
};

global.LoadBlockFromNetwork = function (Params,F)
{
    var BlockNum = Params.BlockNum;
    if(BlockNum >= SERVER.BlockNumDBMin)
    {
        ToLog("Cant LoadBlockFromNetwork:" + BlockNum, 2);
        F(1);
        return;
    }
    
    ToLog("Start DownloadBlockFromNetwork:" + BlockNum, 2);
    var TaskLoadBlockFromNetwork = {MapSend:{}};
    var Ret = SERVER.GetNextNode(TaskLoadBlockFromNetwork, BlockNum, 1, BlockNum);
    if(Ret.Result)
    {
        
        let Node = Ret.Node;
        
        SERVER.SendF(Node, {"Method":"GETBLOCK", "Data":{BlockNum:BlockNum, TreeHash:[]}, "Context":{F:function (Info)
                {
                    
                    var Block = BufLib.GetObjectFromBuffer(Info.Data, FORMAT_BLOCK_TRANSFER, WRK_BLOCK_TRANSFER);
                    Info.Data = undefined;
                    if(!Block.BlockNum || Block.BlockNum !== Params.BlockNum)
                    {
                        ToLog("Error get BlockNum:" + Params.BlockNum + " from " + NodeName(Info.Node), 2);
                        F(1);
                        return;
                    }
                    
                    ToLog("Got BlockFromNetwork:" + Params.BlockNum + " from " + NodeName(Info.Node), 2);
                    
                    var ResError;
                    
                    if(!Block.arrContent || (Block.arrContent.length === 0 && !IsZeroArr(Block.TreeHash)))
                    {
                        ToLog("ERR BLOCK:\n" + JSON.stringify(Block), 2);
                        ResError = 1;
                    }
                    else
                    {
                        ResError = 0;
                        SERVER.WriteBlockDB(Block);
                    }
                    
                    F(ResError, Block);
                }}, });
    }
    else
    {
        ToLog("Not find node for download block", 2);
        F(1);
    }
}


global.CleanChain = GenerateChain;

function GenerateStartedBlocks()
{
    
    if(CREATE_ON_START)
    {
        global.CAN_START = true;
        
        var StartBlockTime;
        if(global.START_BLOCK_RUN)
        {
            StartBlockTime = global.START_BLOCK_RUN;
        }
        else
        {
            
            SERVER.FindStartBlockNum();
            StartBlockTime = SERVER.BlockNumDB;
        }
    }
    if(SERVER.BlockNumDB < GetCurrentBlockNumByTime())
    {
        if(SERVER.BlockNumDB < BLOCK_GENESIS_COUNT)
            SERVER.CreateGenesisBlocks();
        
        if(CREATE_ON_START)
        {
            GenerateChain(StartBlockTime);
        }
    }
    
    if(global.TEST_TRANSACTION_GENERATE)
        setInterval(TransactionGenerate, 1000);
}

function TransactionGenerate()
{
    if(!global.TEST_TRANSACTION_GENERATE)
        return;
    
    var start = SERVER.TreePoolTr.size;
    for(var n = start; n < TEST_TRANSACTION_GENERATE; n++)
    {
        var Tr = GetTestCreateTr("*Block:" + SERVER.CurrentBlockNum + "* port:" + SERVER.port, SERVER.CurrentBlockNum, SERVER.port);
        SERVER.AddTransaction(Tr);
    }
}

function GenerateChain(StartBlockTime)
{
    if(global.TEST_JINN)
        return true;
    if(StartBlockTime < BLOCK_PROCESSING_LENGTH)
        StartBlockTime = BLOCK_PROCESSING_LENGTH * 2 - 1;
    var nStartBlockGenerate = StartBlockTime + 1;
    ToLog("========START GENERATE STARTING BLOCKS======== from : " + nStartBlockGenerate);
    var CountG = 0;
    var PrevBlock = SERVER.ReadBlockHeaderDB(nStartBlockGenerate - 1);
    
    for(var n = nStartBlockGenerate; n <= GetCurrentBlockNumByTime(); n++)
    {
        var Block = {BlockNum:n, TreeHash:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0], Hash:[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], PrevHash:[0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], SeqHash:[0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], Comment1:"STARTED", Comment2:"", TrCount:0, TrDataPos:0,
            TrDataLen:0, };
        var arr = [];
        for(var i = 0; i < BLOCK_PROCESSING_LENGTH; i++)
        {
            var BlockNum = n - BLOCK_PROCESSING_LENGTH2 + i;
            var Prev = SERVER.ReadBlockHeaderDB(BlockNum);
            if(!Prev)
            {
                ToLog("*************************** ERROR Not found : " + BlockNum);
                return false;
            }
            
            arr.push(Prev.Hash);
        }
        
        Block.PrevHash = CalcLinkHashFromArray(arr, Block.BlockNum);
        Block.SeqHash = GetSeqHash(Block.BlockNum, Block.PrevHash, Block.TreeHash);
        
        if(n % 100000 === 0)
            ToLog("Create: " + n);
        var Result = CreateHashMinimal(Block, 0);
        if(!Result)
        {
            throw "ERROR CreateHashMinimal!!";
        }
        
        Block.SumPow = PrevBlock.SumPow + GetPowPower(Block.Hash);
        
        SERVER.WriteBlockDB(Block);
        CountG++;
        
        if(Block.BlockNum >= GetCurrentBlockNumByTime() - 100)
        {
            SERVER.BlockChain[Block.BlockNum] = Block;
            Block.EndExchange = 1;
            Block.bSave = 1;
        }
        
        PrevBlock = Block;
    }
    ToLog("======Was generating " + CountG + " blocks from " + nStartBlockGenerate + " to " + n + " curnum=" + GetCurrentBlockNumByTime());
    SERVER.LoadMemBlocksOnStart();
    SERVER.FREE_ALL_MEM_CHAINS();
    
    if(Block && WALLET && WALLET.WalletOpen)
    {
        var CheckNum = Block.BlockNum - 8;
        var Ret = SetCheckPointOnBlock(CheckNum);
        ToLog("***************************SetCheckPoint result:" + Ret + " on Block:" + CheckNum);
    }
    
    SERVER.ClearBufMap();
    global.CAN_START = true;
    SERVER.LoadHistoryMode = false;
    
    return true;
}

global.HistoryBlockBuf = new STreeBuffer(HISTORY_BLOCK_COUNT * 1000, CompareItemHashSimple, "string");

function UseScoreBlockLoad(Node,BlockNum)
{
    if(Node.Name)
        return 0;
    var MaxBlockNum = GetCurrentBlockNumByTime();
    var Delta = MaxBlockNum - BlockNum;
    if(Delta < 20)
        return 0;
    
    return 1;
}

function SortNodeBlockProcessCountTimeAvg(a,b)
{
    if(b.BlockProcessCountLg !== a.BlockProcessCountLg)
        return b.BlockProcessCountLg - a.BlockProcessCountLg;
    
    if(a.DeltaTimeAvg !== b.DeltaTimeAvg)
        return a.DeltaTimeAvg - b.DeltaTimeAvg;
    
    return a.id - b.id;
}

function GetBlockFromNode(Addr,BlockNum)
{
    var Node = FindNodeByAddr(Addr);
    if(Node)
    {
        var Block = SERVER.ReadBlockHeaderDB(BlockNum);
        Block.MapSend = {};
        Block.Context = {Block:Block};
        SERVER.SendF(Node, {"Method":"GETBLOCK", "Context":Block.Context, "Data":{BlockNum:Block.BlockNum, TreeHash:Block.TreeHash}});
        
        Block.Context.F = function (Info)
        {
            var Node = Info.Node;
            
            var Result = SERVER.RETGETBLOCK(Info);
            ToLog("----------------------------------------------------------------");
            ToLog("TEST BLOCK: " + Block.BlockNum + " from " + NodeName(Node) + " ltime=" + Node.LastDeltaTime + " Result=" + Result);
            ToLog("----------------------------------------------------------------");
        };
    }
}
function GetHeaderFromNode(Addr,BlockNum,bForward)
{
    var Node = FindNodeByAddr(Addr);
    if(Node)
    {
        var BlockDB = SERVER.ReadBlockHeaderDB(BlockNum);
        let Context = {Foward:1, BlockNum:BlockDB.BlockNum, MapSend:{}};
        
        var Data;
        if(bForward)
            Data = {Foward:1, BlockNum:BlockNum, Hash:BlockDB.SumHash};
        else
            Data = {Foward:0, BlockNum:BlockNum, Hash:BlockDB.SumHash, IsSum:1, Count:1};
        
        SERVER.SendF(Node, {"Method":"GETBLOCKHEADER", "Context":Context, "Data":Data, });
        
        Context.F = function (Info)
        {
            var Node = Info.Node;
            
            var BufRead = BufLib.GetReadBuffer(Info.Data);
            var arr = SERVER.GetBlockArrFromBuffer_Load(BufRead, Info);
            
            ToLog("----------------------------------------------------------------");
            ToLog("TEST HEADER: " + BlockDB.BlockNum + " from " + NodeName(Node) + " ltime=" + Node.LastDeltaTime + " arr=" + arr.length);
            ToLog("WANT SUMHASH = " + GetHexFromArr(BlockDB.SumHash));
            ToLog("WANT HASH = " + GetHexFromArr(BlockDB.Hash));
            ToLog("----------------------------------------------------------------");
        };
    }
}
global.GetHeaderFromNode = GetHeaderFromNode;
global.GetBlockFromNode = GetBlockFromNode;
