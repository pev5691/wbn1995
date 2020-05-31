/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';

global.TEST_CACHE_HOT = 1;

class CDBCacheJump extends global.CDBBlockCache
{
    constructor(EngineID, FCalcBlockHash)
    {
        super(EngineID, FCalcBlockHash)
        
        this.JumpTree = new RBTree(function (a,b)
        {
            if(a.BlockNum !== b.BlockNum)
                return a.BlockNum - b.BlockNum;
            return CompareArr(a.SumHash, b.SumHash);
        })
        
        this.StartJumpBlockNum = 0
    }
    
    DoNode()
    {
        super.DoNode()
        
        var NewStartBlockNum = Math.max(JINN_CONST.BLOCK_GENESIS_COUNT, JINN_EXTERN.GetCurrentBlockNumByTime() - 10);
        this.SetNewJumpBlockNum(NewStartBlockNum)
    }
    
    Clear()
    {
        this.JumpTree.clear()
        super.Clear()
    }
    
    SetNewJumpBlockNum(NewStartBlockNum)
    {
        this.StartJumpBlockNum = NewStartBlockNum
        while(1)
        {
            var Find = this.JumpTree.min();
            if(!Find || Find.BlockNum >= NewStartBlockNum)
                break;
            this.JumpTree.remove(Find)
            
            var BlockDB = this.FindBlockByHash(Find.BlockNum, Find.SumHash);
            if(!BlockDB)
            {
                ToLogTrace("SetNewJumpBlockNum: Error on Block=" + Find.BlockNum)
                continue;
            }
            
            var bWas = 0;
            if(Find.JumpToH)
            {
                if(!Find.JumpToH.Position)
                    ToLog("Error JumpToH.Position on Block=" + Find.JumpToH.BlockNum)
                if(BlockDB.HeadPosH !== Find.JumpToH.Position)
                {
                    BlockDB.HeadPosH = Find.JumpToH.Position
                    bWas = 1
                }
                Find.JumpToH = undefined
            }
            if(Find.JumpToB)
            {
                if(!Find.JumpToB.Position)
                    ToLog("Error JumpToH.Position on Block=" + Find.JumpToB.BlockNum)
                if(BlockDB.HeadPosH !== Find.JumpToB.Position)
                {
                    BlockDB.HeadPosH = Find.JumpToB.Position
                    bWas = 1
                }
                Find.JumpToB = undefined
            }
            super.WriteBlock(BlockDB)
        }
    }
    
    SetBlockJump(BlockSeed, Block, StrType)
    {
        if(BlockSeed.BlockNum < this.StartJumpBlockNum)
            return super.SetBlockJump(BlockSeed, Block, StrType);
        
        var Name = "JumpTo" + StrType;
        if(BlockSeed[Name] !== Block)
        {
            
            BlockSeed[Name] = Block
            
            var Find = this.JumpTree.find({BlockNum:BlockSeed.BlockNum, SumHash:BlockSeed.SumHash});
            if(Find)
            {
                this.JumpTree.remove(Find)
            }
            else
            {
                Find = {BlockNum:BlockSeed.BlockNum, SumHash:BlockSeed.SumHash}
            }
            Find[Name] = Block
            
            this.JumpTree.insert(Find)
            
            return 1;
        }
        
        return 0;
    }
    
    GetBlockJump(BlockSeed, StrType)
    {
        if(BlockSeed.BlockNum < this.StartJumpBlockNum)
            return super.GetBlockJump(BlockSeed, StrType);
        
        var Name = "JumpTo" + StrType;
        
        var Find = this.JumpTree.find({BlockNum:BlockSeed.BlockNum, SumHash:BlockSeed.SumHash});
        if(BlockSeed[Name] && (!Find || BlockSeed[Name] !== Find[Name]))
        {
            ToLogTrace("GetBlockJump: Error on Block=" + BlockSeed.BlockNum)
        }
        
        return BlockSeed[Name];
    }
};

global.CDBCacheJump = CDBCacheJump;
