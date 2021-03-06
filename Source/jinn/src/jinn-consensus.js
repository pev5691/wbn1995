/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * The algorithm of the consensus network (the maximal chain of blocks for the amount of PoW)
 *
 */


'use strict';

global.JINN_MODULES.push({InitClass:InitClass, Name:"Consensus"});

global.TEST_DOUBLE_LOAD_BLOCK = 0;

//Engine context

function InitClass(Engine)
{
    Engine.MaxLiderList = {};
    Engine.TestLoadMap = {};
    
    Engine.Header1 = 0;
    Engine.Header2 = 0;
    Engine.Block1 = 0;
    Engine.Block2 = 0;
    
    Engine.LiderIDCounter = 0;
    
    Engine.DoSaveMaxLider = function (CurBlockNum)
    {
        var Store = Engine.GetLiderArrAtNum(CurBlockNum);
        if(Store)
        {
            Engine.DoMaxStatus(Store);
        }
    };
    
    Engine.GetHeaderForChild = function (LoadNum,LoadHash)
    {
        if(LoadNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            var Block = Engine.GetBlockHeaderDB(LoadNum);
            if(!Block)
            {
                ToLogTrace("Cannt GetHeaderForChild Block=" + LoadNum);
                return undefined;
            }
            return Engine.HeaderFromBlock(Block);
        }
        if(!LoadHash)
            return undefined;
        
        var Block = Engine.DB.FindBlockByHash(LoadNum, LoadHash);
        return Engine.HeaderFromBlock(Block);
    };
    
    Engine.GetBodyByHash2 = function (BlockNum,Hash)
    {
        if(IsZeroArr(Hash))
            return undefined;
        
        var Block = Engine.DB.FindBlockByHash(BlockNum, Hash);
        if(!Block)
            return undefined;
        
        if(NeedLoadBodyFromDB(Block))
            Engine.DB.LoadBlockTx(Block);
        
        if(Block.TxData && Block.TxData.length)
            return Engine.BodyFromBlock(Block);
        else
        {
            return {PrevSumHash:Block.PrevSumHash, BlockNum:Block.BlockNum};
        }
    };
    
    Engine.GetBodyByHash = function (BlockNum,Hash)
    {
        if(IsZeroArr(Hash))
            return undefined;
        
        var RetBlock = undefined;
        var Arr = Engine.DB.GetChainArrByNum(BlockNum);
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(Block && (IsEqArr(Block.Hash, Hash) || IsEqArr(Block.SumHash, Hash) || IsEqArr(Block.TreeHash, Hash)))
            {
                if(IsZeroArr(Block.TreeHash))
                {
                    RetBlock = {PrevSumHash:Block.PrevSumHash, BlockNum:Block.BlockNum};
                }
                else
                {
                    if(NeedLoadBodyFromDB(Block))
                        Engine.DB.LoadBlockTx(Block);
                    
                    if(Block.TxData && Block.TxData.length)
                        return Engine.BodyFromBlock(Block);
                }
            }
        }
        return RetBlock;
    };
    
    Engine.PrepareBlockOnReceive = function (Block)
    {
        if(Block.BlockNum >= JINN_CONST.LINK_HASH_PREV_HASHSUM)
        {
            if(Block.PrevSumHash)
                ToLo("Was Block.PrevSumHash=" + GetHexFromArr(Block.PrevSumHash));
            
            Block.PrevSumHash = Block.LinkSumHash;
        }
        
        Engine.CalcBlockData(Block);
    };
    
    Engine.FindHashInStore = function (Store,Name,Hash1,Hash2)
    {
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            var HashCompare = NodeStatus[Name];
            
            if((Hash1 && IsEqArr(Hash1, HashCompare)) || (Hash2 && IsEqArr(Hash2, HashCompare)))
            {
                return NodeStatus.ID;
            }
        }
        return 0;
    };
    Engine.NeedStoreLoad = function (Store,Name,NameNum,BlockNum)
    {
        var ZeroCount = 0;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            if(NodeStatus[NameNum] !== BlockNum || IsZeroArr(NodeStatus[Name]))
                ZeroCount++;
        }
        
        if(Store.LiderArr.length === ZeroCount)
            return 0;
        else
            return 1;
    };
    
    Engine.AddBlockHeader = function (Context,Child,Block,Store)
    {
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Engine.DoMaxStatus(Store);
            return 0;
        }
        
        //block header arrived
        
        Engine.PrepareBlockOnReceive(Block);
        
        Child.ToDebug("Receive Header Block:" + Block.BlockNum);
        var LID = Engine.FindHashInStore(Store, "LoadHash", Block.SumHash, Block.Hash);
        if(!LID)
            return 0;
        
        if(0 && global.TEST_DOUBLE_LOAD_BLOCK)
        {
            if(Engine.TestLoadMap[GetHexFromArr(Block.Hash)])
            {
                Child.ToLog(Engine.GetContInfo(Context) + "  ********* WAS LOADED HEADER=" + Block.BlockNum);
            }
            Engine.TestLoadMap[GetHexFromArr(Block.Hash)] = 1;
        }
        
        //search in the array of loaded blocks
        
        var Find = Engine.DB.FindBlockByHash(Block.BlockNum, Block.SumHash);
        if(!Find)
        {
            Engine.DB.WriteBlock(Block);
            Child.ToDebug("Save Header to DB");
            
            //making a new entry in the array
            
            Engine.DoMaxStatus(Store);
            if(LID)
            {
                
                for(var n = 0; n < Store.LiderArr.length; n++)
                {
                    var NodeStatus = Store.LiderArr[n];
                    if(NodeStatus.ID === LID)
                    {
                        if(!NodeStatus.HeaderLoad)
                            NodeStatus.HeaderLoad = 0;
                        NodeStatus.HeaderLoad++;
                    }
                }
            }
            
            return LID;
        }
        
        return 0;
    };
    
    Engine.AddBlockBody = function (Context,Child,Block,Store)
    {
        
        if(Engine.ProcessBlockOnReceive)
        {
            if(!Engine.ProcessBlockOnReceive(Child, Block))
                return 0;
        }
        
        //we calculate the sent data hash
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        
        if(global.TEST_DOUBLE_LOAD_BLOCK)
        {
            var WasLoad = Engine.TestLoadMap[GetHexFromArr(Block.TreeHash)];
            if(Engine.TestLoadMap[GetHexFromArr(Block.TreeHash)])
            {
                Child.ToLog(Engine.GetContInfo(Context) + " ********* WAS LOADED BODY=" + Block.BlockNum + " FROM " + WasLoad);
            }
            else
            {
                Engine.TestLoadMap[GetHexFromArr(Block.TreeHash)] = Child.ID;
            }
        }
        
        Child.ToDebug("Receive Body Block:" + Block.BlockNum + "  TreeHash=" + Block.TreeHash);
        
        //making an entry in the array of loaded blocks
        var LID = Engine.FindHashInStore(Store, "LoadTreeHash", Block.TreeHash);
        
        var bSaveChain = Engine.DB.SetTxData(Block.BlockNum, Block.TreeHash, Block.TxData);
        if(bSaveChain)
        {
            
            Engine.DoMaxStatus(Store);
        }
        else
        {
            
            Child.ToLog("B:" + Block.BlockNum + " Error block body  - not found TreeHash", 4);
        }
        
        return LID;
    };
    
    Engine.GetFirstEmptyBodyBlockWithCacheCheck = function (BlockHeadNum,BlockSeed)
    {
        
        var BodyForLoad = Engine.GetFirstEmptyBodyBlock(BlockHeadNum, BlockSeed);
        
        while(BodyForLoad && Engine.DB.GetTxDataCache)
        {
            var TxData = Engine.DB.GetTxDataCache(BodyForLoad.TreeHash);
            if(TxData)
            {
                BodyForLoad.TxData = TxData;
                Engine.DB.WriteBlock(BodyForLoad);
                
                BodyForLoad = Engine.GetFirstEmptyBodyBlock(BlockHeadNum, BlockSeed);
                continue;
            }
            
            break;
        }
        
        return BodyForLoad;
    };
    
    Engine.CanDoNextBodyLoad = function (NodeStatus,BlockHead,BlockSeed,Num)
    {
        var BodyForLoad = Engine.GetFirstEmptyBodyBlockWithCacheCheck(BlockHead.BlockNum, BlockSeed);
        
        if(BodyForLoad)
        {
            if(BodyForLoad.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
                ToLogTrace("Error BodyForLoad on " + BodyForLoad.BlockNum);
            Engine.ToDebug("AddBlockBody: BodyForLoad=" + BodyForLoad.BlockNum + " TreeHash=" + BodyForLoad.TreeHash);
            
            //continue loading the body
            NodeStatus.LoadTreeNum = BodyForLoad.BlockNum;
            NodeStatus.LoadTreeHash = BodyForLoad.TreeHash;
            NodeStatus.LoadBlockHead = BodyForLoad;
            
            Engine.SetStatusInfoB(NodeStatus, BodyForLoad, BlockSeed, Num);
            
            return 1;
        }
        else
        {
            NodeStatus.LoadTreeNum = 0;
            NodeStatus.LoadTreeHash = [];
            NodeStatus.LoadBlockHead = undefined;
            return 0;
        }
    };
    
    Engine.SetStatusInfoH = function (Store,Num)
    {
        var NodeStatus = Store.LiderArr[Num];
        
        if(Num !== 0)
            return;
        Engine.Header1 = NodeStatus.LoadNum;
        Engine.Header2 = Store.BlockNum;
    };
    Engine.SetStatusInfoB = function (NodeStatus,LoadBlockHead,BlockSeed,Num)
    {
        if(Num !== 0)
            return;
        
        if(LoadBlockHead)
            Engine.Block1 = LoadBlockHead.BlockNum;
        else
            Engine.Block1 = BlockSeed.BlockNum;
        Engine.Block2 = BlockSeed.BlockNum;
    };
    
    Engine.GetLiderArrAtNum = function (BlockNum)
    {
        var Store = Engine.MaxLiderList[BlockNum];
        if(!Store)
        {
            Store = {BlockNum:BlockNum, LiderArr:[]};
            Engine.MaxLiderList[BlockNum] = Store;
        }
        return Store;
    };
    
    Engine.FillDataMaxLider = function (Data,BlockNum)
    {
        if(Data.DataHash === undefined)
            ToLogTrace("PrecessDataMaxLider Error DataHash on block:" + BlockNum);
        
        if(Data.MinerHash === undefined)
            ToLogTrace("PrecessDataMaxLider Error MinerHash on block:" + BlockNum);
    };
    
    Engine.CalcHashMaxLider = function (Data,BlockNum)
    {
        if(Data.WasHashLider)
            return;
        Data.BlockNum = BlockNum;
        Data.TimeNum = BlockNum;
        if(!Engine.MaxLiderTimeCache)
        {
            Engine.MaxLiderTimeCache = new CTimeCache(function (Val1,Val2)
            {
                var Comp1 = CompareArr(Val1.DataHash, Val2.DataHash);
                if(Comp1)
                    return Comp1;
                var Comp2 = CompareArr(Val1.MinerHash, Val2.MinerHash);
                if(Comp2)
                    return Comp2;
                return Val1.BlockNum - Val2.BlockNum;
            });
        }
        
        var Find = Engine.MaxLiderTimeCache.FindItemInCache(Data);
        if(Find)
        {
            Data.Hash = Find.Hash;
            Data.PowHash = Find.PowHash;
            Data.Power = Find.Power;
        }
        else
        {
            Engine.CalcHashMaxLiderInner(Data, BlockNum);
            Engine.MaxLiderTimeCache.AddItemToCache(Data);
        }
        
        Data.WasHashLider = 1;
    };
    
    Engine.CalcHashMaxLiderInner = function (Data,BlockNum)
    {
        
        if(!Data.DataHash || IsZeroArr(Data.DataHash))
            ToLogTrace("ZERO DataHash on block:" + BlockNum);
        
        Data.Hash = sha3(Data.DataHash.concat(Data.MinerHash).concat(GetArrFromValue(Data.BlockNum)), 10);
        Data.PowHash = Data.Hash;
        Data.Power = GetPowPowerBlock(BlockNum, Data.Hash);
    };
    
    Engine.CompareMaxLider = function (Data1,Data2)
    {
        if(Data1.Power < Data2.Power || (Data1.Power === Data2.Power && CompareArr(Data2.Hash, Data1.Hash) <= 0))
        {
            return  - 1;
        }
        else
        {
            return 1;
        }
    };
    
    Engine.FindRowByDataHash = function (Arr,DataHash,Miner)
    {
        for(var n = 0; n < Arr.length; n++)
        {
            var NodeStatus = Arr[n];
            var Miner2 = ReadUintFromArr(NodeStatus.MinerHash, 0);
            if(Miner === Miner2 && IsEqArr(DataHash, NodeStatus.DataHash))
            {
                return n;
            }
        }
        return  - 1;
    };
    
    Engine.AddHashToMaxLider = function (Data,BlockNum,bFromCreateNew)
    {
        if(!bFromCreateNew && !Engine.CanProcessMaxHash(BlockNum))
            return  - 1;
        
        Engine.AddMaxHashToTimeStat(Data, BlockNum);
        
        Engine.CalcHashMaxLider(Data, BlockNum);
        Engine.FillDataMaxLider(Data, BlockNum);
        
        var Store = Engine.GetLiderArrAtNum(BlockNum);
        var LiderArr = Store.LiderArr;
        
        var Ret =  - 1;
        
        for(var n = 0; n < LiderArr.length; n++)
        {
            var NodeStatus = LiderArr[n];
            if(IsEqArr(NodeStatus.Hash, Data.Hash))
                return  - 1;
            
            if(Engine.CompareMaxLider(NodeStatus, Data) < 0)
            {
                Ret = n;
                break;
            }
        }
        var Miner = ReadUintFromArr(Data.MinerHash, 0);
        var DataHashN = Engine.FindRowByDataHash(LiderArr, Data.DataHash, Miner);
        if(DataHashN !==  - 1)
        {
            if(DataHashN < Ret)
            {
                return  - 1;
            }
            else
            {
                
                var Item = LiderArr[DataHashN];
                Data.LoadNum = Item.LoadNum;
                Data.LoadHash = Item.LoadHash;
                Data.LoadTreeNum = Item.LoadTreeNum;
                Data.LoadTreeHash = Item.LoadTreeHash;
                
                LiderArr.splice(DataHashN, 1);
            }
        }
        
        if(Ret ===  - 1 && LiderArr.length < JINN_CONST.MAX_LEADER_COUNT)
        {
            Ret = LiderArr.length;
        }
        
        if(Ret >= 0)
        {
            Engine.LiderIDCounter++;
            Data.ID = Engine.LiderIDCounter;
            if(!Data.LoadHash)
            {
                Data.LoadNum = 0;
                Data.LoadHash = [];
                Data.LoadTreeNum = 0;
                Data.LoadTreeHash = [];
            }
            LiderArr.splice(Ret, 0, Data);
            if(LiderArr.length > JINN_CONST.MAX_LEADER_COUNT)
                LiderArr.length = JINN_CONST.MAX_LEADER_COUNT;
        }
        var MaxPower = LiderArr[0].Power;
        for(var n = 1; n < LiderArr.length; n++)
        {
            var NodeStatus = LiderArr[n];
            if(MaxPower >= NodeStatus.Power + 4)
            {
                LiderArr.splice(n, 1);
                n--;
            }
        }
        
        if(!bFromCreateNew)
            Engine.DoMaxStatus(Store);
        
        return Ret;
    };
    
    Engine.DoMaxStatus = function (Store)
    {
        var BlockNum = Store.BlockNum;
        for(var n = 0; n < Store.LiderArr.length; n++)
        {
            var NodeStatus = Store.LiderArr[n];
            var BlockSeed = Engine.DB.FindBlockByHash(BlockNum, NodeStatus.Hash);
            
            if(!BlockSeed)
            {
                NodeStatus.LoadNum = BlockNum;
                NodeStatus.LoadHash = NodeStatus.Hash;
                Engine.SetStatusInfoH(Store, n);
                continue;
            }
            
            var BlockHead = Engine.GetFirstHeadBlock(BlockSeed);
            
            //checking for database entries
            if(!Engine.IsExistBlockDB(BlockHead))
            {
                if(BlockHead.BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT)
                {
                    NodeStatus.LoadNum = BlockHead.BlockNum - 1;
                    NodeStatus.LoadHash = BlockHead.PrevSumHash;
                    NodeStatus.LoadBlockHead = BlockHead;
                    Engine.SetStatusInfoH(Store, n);
                }
            }
            else
            {
                if(n === 0)
                {
                    Engine.Header1 = BlockSeed.BlockNum;
                    Engine.Header2 = Engine.Header1;
                }
                NodeStatus.LoadNum = 0;
                NodeStatus.LoadHash = [];
                NodeStatus.LoadBlockHead = undefined;
                if(Engine.CanDoNextBodyLoad(NodeStatus, BlockHead, BlockSeed, n))
                    continue;
                var Res = Engine.CheckAndSaveChainToDB(BlockHead, BlockSeed);
                if(Res ==  - 1)
                    return;
                
                if(n === 0)
                {
                    Engine.Block1 = BlockSeed.BlockNum;
                    Engine.Block2 = Engine.Block1;
                }
            }
        }
    };
    
    Engine.CheckAndSaveChainToDB = function (BlockHead,BlockSeed)
    {
        
        //Calc SumPow
        var BlockDB = Engine.GetBlockHeaderDB(BlockHead.BlockNum);
        if(!BlockDB)
            return 0;
        
        var CurBlockNumT = Engine.CurrentBlockNum;
        var BlockNumSave = CurBlockNumT - JINN_CONST.STEP_SAVE;
        var BlockNumLast = CurBlockNumT - JINN_CONST.STEP_LAST;
        var BlockNumDB = Engine.GetMaxNumBlockDB();
        if(BlockNumDB === BlockNumSave - 1)
            BlockNumSave--;
        while(BlockSeed.BlockNum > BlockNumSave)
        {
            var PrevBlockSeed = Engine.GetPrevBlock(BlockSeed);
            if(!PrevBlockSeed)
            {
                Engine.ToLog("#1 CheckAndSaveChainToDB: Error GetPrevBlock at block=" + BlockSeed.BlockNum, 3);
                return 0;
            }
            BlockSeed = PrevBlockSeed;
        }
        
        if(BlockSeed.BlockNum < BlockNumSave)
            return 0;
        if(BlockSeed.Power === 0)
            return 0;
        if(BlockHead.BlockNum >= BlockSeed.BlockNum)
            return 0;
        if(BlockNumDB === BlockSeed.BlockNum)
        {
            var BlockDB = Engine.GetBlockHeaderDB(BlockNumDB);
            CalcAvgSumPow(BlockDB);
            CalcAvgSumPow(BlockSeed);
            if(BlockSeed.SumPow <= BlockDB.SumPow)
            {
                return 0;
            }
        }
        
        //writing a chain to the database
        
        var Count = BlockSeed.BlockNum - BlockHead.BlockNum;
        var Delta = CurBlockNumT - BlockSeed.BlockNum;
        var Res = Engine.DB.SaveChainToDB(BlockHead, BlockSeed);
        var Miner = ReadUintFromArr(BlockSeed.MinerHash, 0);
        if(BlockSeed.BlockNum > 20)
            Engine.ToLog("SaveChainToDB: " + BlockInfo(BlockHead) + " - " + BlockInfo(BlockSeed) + "  ### SumPow=" + BlockSeed.SumPow + " Miner=" + Miner + " COUNT=" + Count,
            3);
        
        if(Res !== 1)
        {
            Engine.ToLog("Error on SaveChainToDB " + BlockHead.BlockNum + "-" + BlockSeed.BlockNum + " POW:" + BlockSeed.SumPow, 2);
            Engine.TruncateChain(BlockHead.BlockNum);
            return Res;
        }
        
        JINN_STAT.MainDelta = Math.max(JINN_STAT.MainDelta, Engine.CurrentBlockNum - BlockHead.BlockNum);
        
        return Res;
    };
    
    Engine.CanProcessBlock = function (BlockNum,Step)
    {
        var CurBlockNum = Engine.CurrentBlockNum - Step;
        var Delta = CurBlockNum - BlockNum;
        if(Math.abs(Delta) <= JINN_CONST.MAX_DELTA_PROCESSING)
            return 1;
        JINN_STAT.ErrProcessBlock++;
        return 0;
    };
    
    Engine.CanProcessMaxHash = function (BlockNum)
    {
        var CurBlockNumTime = Engine.CurrentBlockNum;
        var BlockNum1 = CurBlockNumTime - JINN_CONST.STEP_CALC_POW_FIRST - JINN_CONST.MAX_DELTA_PROCESSING;
        var BlockNum2 = CurBlockNumTime - JINN_CONST.STEP_CALC_POW_LAST + 1;
        if(BlockNum1 <= BlockNum && BlockNum <= BlockNum2)
            return 1;
        
        JINN_STAT.ErrProcessBlock++;
        return 0;
    };
}

