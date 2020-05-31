/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';

global.TEST_CACHE_HOT = 1;

class CDBCacheHot extends global.CDBBlockCache
{
    constructor(EngineID, FCalcBlockHash)
    {
        super(EngineID, FCalcBlockHash)
        
        this.ChainIndexHot = new RBTree(function (a,b)
        {
            return a.BlockNum - b.BlockNum;
        })
        this.MainIndexHot = new RBTree(function (a,b)
        {
            return a.BlockNum - b.BlockNum;
        })
        
        this.StartHotBlockNum = 1e9
    }
    
    DoNode()
    {
        super.DoNode()
        
        var NewStartBlockNum = Math.max(JINN_CONST.BLOCK_GENESIS_COUNT, JINN_EXTERN.GetCurrentBlockNumByTime() - 0);
        this.SetNewHotBlockNum(NewStartBlockNum)
    }
    
    Clear()
    {
        this.MainIndexHot.clear()
        this.ChainIndexHot.clear()
        super.Clear()
    }
    
    SetNewHotBlockNum(NewStartBlockNum)
    {
        this.StartHotBlockNum = NewStartBlockNum
        while(1)
        {
            var Find = this.ChainIndexHot.min();
            if(!Find || Find.BlockNum >= NewStartBlockNum)
                break;
            this.ChainIndexHot.remove(Find)
            
            super.TruncateIndex(Find.BlockNum - 1)
            for(var i = 0; i < Find.Arr.length; i++)
            {
                var Block = Find.Arr[i];
                if(Block.JumpToH)
                {
                    if(!Block.JumpToH.Position)
                        ToLog("Error JumpToH.Position on Block=" + Block.JumpToH.BlockNum)
                    Block.HeadPosH = Block.JumpToH.Position
                    Block.JumpToH = undefined
                }
                if(Block.JumpToB)
                {
                    if(!Block.JumpToB.Position)
                        ToLog("Error JumpToB.Position on Block=" + Block.JumpToB.BlockNum)
                    Block.HeadPosB = Block.JumpToB.Position
                    Block.JumpToB = undefined
                }
                
                super.WriteBlock(Block)
                Block.WasWriteFromHot = 1
            }
        }
        while(1)
        {
            var Block = this.MainIndexHot.min();
            if(!Block || Block.BlockNum >= NewStartBlockNum)
                break;
            
            this.MainIndexHot.remove(Block)
            super.WriteMainIndex(Block.BlockNum, Block.Position)
        }
    }
    WriteBlock(Block)
    {
        if(Block.BlockNum < this.StartHotBlockNum)
            return super.WriteBlock(Block);
        
        var Find = this.ChainIndexHot.find({BlockNum:Block.BlockNum});
        if(!Find)
        {
            Find = {BlockNum:Block.BlockNum, Arr:[]}
            this.ChainIndexHot.insert(Find)
        }
        
        for(var i = 0; i < Find.Arr.length; i++)
        {
            var Block0 = Find.Arr[i];
            if(Block0 === Block)
                continue;
            if(IsEqArr(Block0.SumHash, Block.SumHash))
            {
                ToLogTrace("Was Block with some SumHash=" + GetHexFromArr(Block.SumHash) + " on Block=" + Block.BlockNum)
                Find.Arr[i] = Block
                return 1;
            }
            if(IsEqArr(Block0.Hash, Block.Hash))
            {
                ToLogTrace("Was Block with some Hash=" + GetHexFromArr(Block.Hash) + " on Block=" + Block.BlockNum)
                Find.Arr[i] = Block
                return 1;
            }
        }
        
        if(Block.SaveToHot)
            return 1;
        
        Find.Arr.push(Block)
        Block.SaveToHot = 1
        return 1;
    }
    GetMaxIndex()
    {
        
        var Find = this.ChainIndexHot.max();
        if(Find)
            return Find.BlockNum;
        else
            return super.GetMaxIndex();
    }
    
    ReadIndex(BlockNum)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.ReadIndex(BlockNum);
        if(global.TEST_CACHE_HOT)
            ToLogTrace("Error hot ReadIndex on block=" + BlockNum)
        return undefined;
    }
    
    WriteIndex(Item)
    {
        if(Item.BlockNum < this.StartHotBlockNum)
            return super.WriteIndex(Item);
        if(global.TEST_CACHE_HOT)
            ToLogTrace("Error hot WriteIndex on block=" + Item.BlockNum)
        return 0;
    }
    
    TruncateIndex(LastBlockNum)
    {
        while(1)
        {
            var Find = this.ChainIndexHot.max();
            if(!Find || Find.BlockNum <= LastBlockNum)
                break;
            
            this.ChainIndexHot.remove(Find)
        }
        
        if(LastBlockNum < this.StartHotBlockNum)
            return super.TruncateIndex(LastBlockNum);
        
        return 1;
    }
    WriteBlockMain(Block)
    {
        if(Block.BlockNum < this.StartHotBlockNum)
            return super.WriteBlockMain(Block);
        
        this.MainIndexHot.remove({BlockNum:Block.BlockNum})
        this.MainIndexHot.insert(Block)
        return 1;
    }
    ReadBlockMain(BlockNum)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.ReadBlockMain(BlockNum);
        
        var Find = this.MainIndexHot.find({BlockNum:BlockNum});
        if(Find)
            return Find;
        else
            return undefined;
    }
    
    GetMaxMainIndex()
    {
        var Block = this.MainIndexHot.max();
        if(Block)
            return Block.BlockNum;
        else
            return super.GetMaxMainIndex();
    }
    
    ReadMainIndex(BlockNum)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.ReadMainIndex(BlockNum);
        if(global.TEST_CACHE_HOT)
            ToLogTrace("Error hot ReadMainIndex on block=" + BlockNum)
        return undefined;
    }
    WriteMainIndex(BlockNum, Position)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.WriteMainIndex(BlockNum, Position);
        if(global.TEST_CACHE_HOT)
            ToLogTrace("Error hot WriteMainIndex on block=" + BlockNum)
        return 0;
    }
    TruncateMain(LastBlockNum)
    {
        while(1)
        {
            var Block = this.MainIndexHot.max();
            if(!Block || Block.BlockNum <= LastBlockNum)
                break;
            
            this.MainIndexHot.remove(Block)
        }
        
        if(LastBlockNum < this.StartHotBlockNum)
            return super.TruncateMain(LastBlockNum);
        
        return 1;
    }
    LoadBlockTx(Block)
    {
        if(Block.BlockNum < this.StartHotBlockNum)
            return super.LoadBlockTx(Block);
        if(global.TEST_CACHE_HOT)
            ToLogTrace("Error hot LoadBlockTx on block=" + Block.BlockNum)
        return 0;
    }
    
    GetBodyFilePosition(LastPosition, BlockNum, TreeHash, TxData)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.GetBodyFilePosition(LastPosition, BlockNum, TreeHash, TxData);
        if(global.TEST_CACHE_HOT)
            ToLogTrace("Error hot GetBodyFilePosition on block=" + BlockNum)
        return 0;
    }
    SetTxData(BlockNum, TreeHash, TxData)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.SetTxData(BlockNum, TreeHash, TxData);
        if(IsZeroArr(TreeHash))
            return 0;
        
        var Arr = this.GetChainArrByNum(BlockNum);
        var Count = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(IsEqArr(Block.TreeHash, TreeHash))
            {
                Block.TxData = TxData
                Count++
            }
        }
        
        return Count;
    }
    
    GetChainArrByNum(BlockNum)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.GetChainArrByNum(BlockNum);
        
        var Find = this.ChainIndexHot.find({BlockNum:BlockNum});
        if(Find)
            return Find.Arr;
        else
            return [];
    }
    
    FindBlockByHash(BlockNum, Hash)
    {
        if(BlockNum < this.StartHotBlockNum)
            return super.FindBlockByHash(BlockNum, Hash);
        
        var Arr = this.GetChainArrByNum(BlockNum);
        var Count = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Block = Arr[i];
            if(IsEqArr(Block.Hash, Hash))
                return Block;
            if(IsEqArr(Block.SumHash, Hash))
                return Block;
        }
        
        return undefined;
    }
    
    SetBlockJump(BlockSeed, Block, StrType)
    {
        if(BlockSeed.BlockNum < this.StartHotBlockNum)
            return super.SetBlockJump(BlockSeed, Block, StrType);
        
        var Name = "JumpTo" + StrType;
        if(BlockSeed[Name] !== Block)
        {
            BlockSeed[Name] = Block
            this.WriteBlock(Block)
            return 1;
        }
        
        return 0;
    }
    
    GetBlockJump(BlockSeed, StrType)
    {
        if(BlockSeed.BlockNum < this.StartHotBlockNum)
            return super.GetBlockJump(BlockSeed, StrType);
        
        var Name = "JumpTo" + StrType;
        return BlockSeed[Name];
    }
    SaveChainToDB(BlockHead, BlockSeed)
    {
        var Arr = [];
        while(BlockSeed.BlockNum >= this.StartHotBlockNum)
        {
            Arr.push(BlockSeed)
            var BlockSeed = this.GetPrevBlockDB(BlockSeed);
            if(!BlockSeed)
            {
                ToLog("#2 SaveChainToDB: Error PrevBlock on Block=" + BlockSeed.BlockNum)
                return  - 1;
            }
        }
        var Result = 1;
        if(BlockSeed.BlockNum > BlockHead.BlockNum)
        {
            Result = super.SaveChainToDB(BlockHead, BlockSeed)
        }
        
        if(Result <= 0)
            return Result;
        for(var i = Arr.length - 1; i >= 0; i--)
        {
            this.WriteBlockMain(Arr[i])
        }
        return Result;
    }
};

global.CDBCacheHot = CDBCacheHot;
