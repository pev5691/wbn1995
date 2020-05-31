/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 * Working with blocks, creating a new block, determining the Genesis of the block
 *
 * The formula for calculating hashes:
 *
 *   LinkSumHash | -----------> DataHash | ---------------->    Hash
 *        +      |                  +    |
 *     TreeHash  |              MinerHash|
 *
 * i.e.:
 * LinkSumHash + TreeHash  = DataHash
 * DataHash + MinerHash    = Hash
 **/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Block"});

function DoNode(Engine)
{
    Engine.TickNum++;
}

//Engine context

function InitClass(Engine)
{
    Engine.TickNum = 0;
    
    // Modeling...
    
    Engine.GenesisArr = [];
    Engine.GetGenesisBlock = function (Num)
    {
        if(Engine.GenesisArr[Num])
            return Engine.GenesisArr[Num];
        
        if(Num >= JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            ToLogTrace("Error GenesisBlock Num = " + Num);
            return undefined;
        }
        
        var PrevBlock;
        if(!Num)
            PrevBlock = {Hash:ZERO_ARR_32, SumPow:0, SumHash:ZERO_ARR_32, };
        else
            PrevBlock = Engine.GetGenesisBlock(Num - 1);
        
        var Block = {};
        Block.Genesis = 1;
        Block.BlockNum = Num;
        Block.TxData = [];
        Block.LinkSumHash = ZERO_ARR_32;
        Block.TreeHash = ZERO_ARR_32;
        Block.MinerHash = ZERO_ARR_32;
        Block.PrevSumHash = PrevBlock.SumHash;
        Block.PrevSumPow = PrevBlock.SumPow;
        Engine.CalcBlockData(Block);
        
        Engine.GenesisArr[Num] = Block;
        return Block;
    };
    
    Engine.GetCopyBlock = function (Block)
    {
        var BlockNew = {};
        BlockNew.BlockNum = Block.BlockNum;
        BlockNew.TreeHash = Block.TreeHash;
        BlockNew.MinerHash = Block.MinerHash;
        BlockNew.TxCount = Block.TxCount;
        
        BlockNew.PrevSumPow = Block.PrevSumPow;
        BlockNew.PrevSumHash = Block.PrevSumHash;
        BlockNew.PrevBlockPosition = Block.PrevBlockPosition;
        
        return BlockNew;
    };
    
    Engine.GetNewBlock = function (PrevBlock)
    {
        if(!PrevBlock)
            return undefined;
        
        var Block = {};
        Block.BlockNum = PrevBlock.BlockNum + 1;
        Engine.FillBodyTransferTx(Block);
        
        Block.MinerHash = ZERO_ARR_32;
        Block.PrevSumHash = PrevBlock.SumHash;
        Block.PrevSumPow = PrevBlock.SumPow;
        
        if(Engine.GetNewBlockNext)
            Engine.GetNewBlockNext(Block, PrevBlock);
        
        Engine.CalcBlockData(Block);
        return Block;
    };
    
    // Serylizing...
    
    Engine.HeaderFromBlock = function (Block)
    {
        if(!Block)
            return undefined;
        
        if(Block.BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT && IsZeroArr(Block.PrevSumHash))
            ToLog("ZeroArr PrevSumHash on BlockNum=" + Block.BlockNum);
        var Data = {BlockNum:Block.BlockNum, LinkSumHash:Block.PrevSumHash, TreeHash:Block.TreeHash, MinerHash:Block.MinerHash, PrevSumPow:Block.PrevSumPow,
            PrevSumHash:Block.PrevSumHash, Size:4 * 32 + 2 * 6, };
        
        return Data;
    };
    
    Engine.BodyFromBlock = function (Block)
    {
        if(!IsZeroArr(Block.TreeHash) && (!Block.TxData || Block.TxData.length === 0))
            ToLogTrace("BodyFromBlock : Error block tx data TreeHash=" + Block.TreeHash + " on block: " + Block.BlockNum);
        
        var Data = {BlockNum:Block.BlockNum, TreeHash:Block.TreeHash, PrevSumHash:Block.PrevSumHash, TxData:Block.TxData, };
        
        var Size = 10;
        for(var i = 0; i < Data.TxData.length; i++)
        {
            Size += Data.TxData[i].body.length;
        }
        Data.Size = Size;
        
        return Data;
    };
    
    Engine.CheckHashExistArr = function (TxArr)
    {
        for(var n = 0; TxArr && n < TxArr.length; n++)
            Engine.CheckHashExist(TxArr[n]);
    };
    
    Engine.CalcTreeHash = function (BlockNum,TxArr)
    {
        if(!TxArr || !TxArr.length)
            return ZERO_ARR_32;
        
        var Buf = [];
        for(var n = 0; n < TxArr.length; n++)
        {
            var Tx = TxArr[n];
            
            CheckTx("=CalcTreeHash=", Tx, BlockNum, 1);
            
            var Hash = Tx.HASH;
            for(var h = 0; h < Hash.length; h++)
                Buf.push(Hash[h]);
        }
        if(!Buf.length)
            throw "Error Buf CalcTreeHash";
        
        var arr = sha3(Buf, 4);
        return arr;
    };
    
    Engine.SortBlock = function (Block)
    {
        if(!Block || !Block.TxData || Block.TxData.length <= 1)
            return;
        for(var i = 0; i < Block.TxData.length; i++)
            Engine.CheckHashExist(Block.TxData[i]);
        Block.TxData.sort(function (a,b)
        {
            
            if(a.nonce !== b.nonce)
                return a.nonce - b.nonce;
            
            if(b.TimePow !== a.TimePow)
                return b.TimePow - a.TimePow;
            return CompareArr(a.HashPow, b.HashPow);
        });
    };
    
    Engine.CalcBlockData = function (Block)
    {
        
        Engine.CalcBlockHash(Block);
        Engine.CalcSumHash(Block);
        
        if(Engine.CheckMaxHash)
            Engine.CheckMaxHash(Block);
    };
    
    Engine.CalcBlockHash = function (Block)
    {
        if(!Block.PrevSumHash)
            ToLogTrace("Error No PrevSumHash on Block=" + Block.BlockNum);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.LinkSumHash = ZERO_ARR_32;
        }
        else
        {
            Block.LinkSumHash = Block.PrevSumHash;
        }
        
        if(Block.PrevSumPow === undefined)
            ToLogTrace("Error No Block.PrevSumPow on Block=" + Block.BlockNum);
        
        Block.DataHash = sha3(Block.LinkSumHash.concat(Block.TreeHash), 5);
        
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            Block.Hash = ZERO_ARR_32.slice();
            Block.Hash[0] = 1 + Block.BlockNum;
            Block.Hash[31] = Block.Hash[0];
        }
        else
        {
            Block.Hash = sha3(Block.DataHash.concat(Block.MinerHash).concat(GetArrFromValue(Block.BlockNum)), 6);
        }
        
        Block.Power = GetPowPowerBlock(Block.BlockNum, Block.Hash);
        Block.SumPow = Block.PrevSumPow + Block.Power;
    };
    
    Engine.CalcSumHash = function (Block)
    {
        if(Block.BlockNum === 0)
            Block.SumHash = ZERO_ARR_32;
        else
        {
            if(!Block.PrevSumHash)
                ToLogTrace("Error No PrevSumHash on Block=" + Block.BlockNum);
            
            if(Block.SumPow === undefined)
                ToLogTrace("Error No SumPow on Block=" + Block.BlockNum);
            
            var arr_sum_pow = [];
            WriteUintToArr(arr_sum_pow, Block.SumPow);
            Block.SumHash = sha3(Block.PrevSumHash.concat(Block.Hash).concat(arr_sum_pow), 7);
        }
    };
    
    Engine.CheckHashExist = function (Tx)
    {
        if(!Tx.KEY)
        {
            var Tx2 = Engine.GetTx(Tx.body);
            CopyObjKeys(Tx, Tx2);
        }
    };
    
    Engine.FillTicket = function (Tx,Sha3Num)
    {
        var FullHashTicket = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for(var i = 0; i < JINN_CONST.TX_TICKET_HASH_LENGTH; i++)
            FullHashTicket[i] = Tx.HashTicket[i];
        WriteUintToArrOnPos(FullHashTicket, Tx.num, JINN_CONST.TX_TICKET_HASH_LENGTH);
        
        Tx.HashPow = sha3(FullHashTicket, Sha3Num);
        Tx.TimePow = GetPowPower(Tx.HashPow);
    };
    
    Engine.DoTicketFromTx = function (Tt,Tx)
    {
        Tt.IsTx = Tx.IsTx;
        Tt.HASH = Tx.HASH;
        Tt.body = Tx.body;
        Tt.nonce = Tx.nonce;
    };
    
    Engine.GetTicket = function (HashTicket,Key,Num)
    {
        
        var Tx = {HashTicket:HashTicket, KEY:Key, num:Num};
        Engine.FillTicket(Tx, 9);
        
        return Tx;
    };
    
    Engine.GetTx = function (body,HASH,HashPow)
    {
        
        var Tx = {};
        Tx.IsTx = 1;
        Tx.nonce = ReadUintFromArr(body, body.length - 6);
        Tx.num = ReadUintFromArr(body, body.length - 12);
        if(HASH)
            Tx.HASH = HASH;
        else
            Tx.HASH = sha3(body, 9);
        
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TX_TICKET_HASH_LENGTH);
        Tx.KEY = GetHexFromArr(Tx.HashTicket);
        Tx.body = body;
        if(HashPow)
        {
            Tx.HashPow = HashPow;
            Tx.TimePow = GetPowPower(HashPow);
        }
        else
        {
            Engine.FillTicket(Tx, 8);
        }
        
        return Tx;
    };
}

function NeedLoadBodyFromNet(Block)
{
    if(IsZeroArr(Block.TreeHash))
        return 0;
    
    if(Block.TxPosition)
        return 0;
    
    if(Block.TxData)
        return 0;
    
    return 1;
}

function NeedLoadBodyFromDB(Block)
{
    if(Block && !IsZeroArr(Block.TreeHash) && !Block.TxData && Block.TxPosition)
        return 1;
    else
        return 0;
}

function CalcAvgSumPow(Block)
{
    Block.AvgSumPow = Block.SumPow / Block.BlockNum;
}
function GetPowPowerBlock(BlockNum,arrhash)
{
    var Power = GetPowPower(arrhash);
    return Power;
}

global.GetPowPowerBlock = GetPowPowerBlock;
global.CalcAvgSumPow = CalcAvgSumPow;
global.NeedLoadBodyFromNet = NeedLoadBodyFromNet;
global.NeedLoadBodyFromDB = NeedLoadBodyFromDB;

global.BlockInfo = function (Block)
{
    CalcAvgSumPow(Block);
    return "" + Block.BlockNum + " (" + GetHexFromArr(Block.SumHash).substr(0, 8) + "<" + GetHexFromArr(Block.PrevSumHash).substr(0,
    8) + ") Avg=" + Block.AvgSumPow + " Pow=" + Block.Power;
}
