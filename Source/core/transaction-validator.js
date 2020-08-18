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

require("../system/dapp");
require("../system/accounts");
require("../system/smart");
require("../system/file");

if(global.PROCESS_NAME === "MAIN")
{
    require("./wallet");
}

module.exports = class CSmartContract extends require("./block-exchange")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        
        this.BufHashTree = new RBTree(CompareArr)
        this.BufHashTree.LastAddNum = 0
        
        this.SenderMap = {}
        this.SenderBlockHashMap = {}
        
        if(!global.ADDRLIST_MODE && !this.VirtualMode && global.START_SERVER)
        {
            setInterval(this.ClearOldSenderMapItem.bind(this), 10000)
        }
    }
    AddBlockToHashTree(Block)
    {
        this.BufHashTree.LastAddNum = Block.BlockNum
        var arr = Block.arrContent;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = sha3(arr[i], 35);
                this.BufHashTree.insert(HASH)
            }
        }
    }
    DeleteBlockFromHashTree(Block)
    {
        var arr = Block.arrContent;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = sha3(arr[i], 36);
                this.BufHashTree.remove(HASH)
            }
        }
    }
    OnWriteBlock(Block)
    {
        if(Block.BlockNum < GetCurrentBlockNumByTime() - 1000)
            return;
        
        this.AddToSenderMap(Block)
    }
    
    OnDelete(Block)
    {
    }
    
    BlockProcessTX(Block)
    {
        var BlockNum = Block.BlockNum;
        if(!BlockNum || BlockNum <= 0)
            return;
        
        var COUNT_MEM_BLOCKS = 0;
        var NUM1 = 1240000;
        var NUM2 = 1400000;
        if(global.LOCAL_RUN || global.FORK_MODE)
        {
            NUM1 = 1000000000000
            NUM2 = 1000000000000
        }
        
        if(BlockNum > global.BLOCKNUM_TICKET_ALGO)
        {
            NUM1 = 1000000000000
            NUM2 = 1000000000000
        }
        
        if(BlockNum > NUM1)
        {
            COUNT_MEM_BLOCKS = 1
            if(BlockNum > NUM2)
                COUNT_MEM_BLOCKS = 60
            
            if(this.BufHashTree.LastAddNum !== BlockNum - 1)
            {
                this.BufHashTree.clear()
                for(var num = COUNT_MEM_BLOCKS; num >= 1; num--)
                {
                    var Block2 = this.ReadBlockDB(BlockNum - num);
                    if(Block2)
                    {
                        this.AddBlockToHashTree(Block2)
                    }
                }
            }
        }
        
        for(var key in DApps)
        {
            DApps[key].OnWriteBlockStart(Block)
        }
        
        var arrContentResult = [];
        
        var arr = Block.arrContent;
        if(arr)
            for(var i = 0; i < arr.length; i++)
            {
                var HASH = sha3(arr[i], 37);
                
                if(this.BufHashTree.find(HASH))
                {
                    continue;
                }
                
                var type = arr[i][0];
                var App = DAppByType[type];
                if(App)
                {
                    App.ResultTx = 0
                    DApps.Accounts.BeginTransaction()
                    var StrHex = GetHexFromArr(HASH);
                    var item;
                    global.CurTrItem = undefined
                    if(global.TreeFindTX)
                    {
                        item = global.TreeFindTX.LoadValue(StrHex)
                        if(item)
                            global.CurTrItem = item.TX
                    }
                    var Result = App.OnWriteTransaction(Block, arr[i], BlockNum, i);
                    var SetResult = Result;
                    if(Result === true)
                    {
                        if(App.ResultTx)
                            SetResult = App.ResultTx
                        if(!DApps.Accounts.CommitTransaction(BlockNum, i))
                            SetResult = 0
                    }
                    else
                    {
                        
                        DApps.Accounts.RollBackTransaction()
                        SetResult = 0
                    }
                    if(SetResult === true)
                        SetResult = 1
                    arrContentResult[i] = SetResult
                    
                    if(item)
                    {
                        var ResultStr = Result;
                        if(Result === true || typeof Result === "number")
                        {
                            ResultStr = "Add to blockchain"
                            if(type === global.TYPE_TRANSACTION_FILE)
                                ResultStr += ": file/" + BlockNum + "/" + i
                        }
                        item.cmd = "RetFindTX"
                        item.ResultStr = "" + ResultStr
                        item.bFinal = 1
                        item.Result = SetResult
                        process.send(item)
                    }
                    
                    global.CurTrItem = undefined
                }
            }
        
        if(COUNT_MEM_BLOCKS)
        {
            var Block2 = this.ReadBlockDB(BlockNum - COUNT_MEM_BLOCKS);
            if(Block2)
                this.DeleteBlockFromHashTree(Block2)
            
            this.AddBlockToHashTree(Block)
        }
        if(arrContentResult.length)
        {
            if(global.JINN_MODE)
            {
                JINN.DBResult.WriteBodyResult(BlockNum, arrContentResult)
            }
            else
            {
                process.send({cmd:"WriteBodyResult", BlockNum:BlockNum, arrContentResult:arrContentResult})
            }
        }
        
        for(var key in DApps)
        {
            DApps[key].OnWriteBlockFinish(Block)
        }
    }
    
    BlockDeleteTX(Block)
    {
        this.BufHashTree.LastAddNum = 0
        
        for(var key in DApps)
        {
            DApps[key].OnDeleteBlock(Block)
        }
    }
    
    IsValidTransaction(Tr, BlockNum)
    {
        if(!Tr.body || Tr.body.length < MIN_TRANSACTION_SIZE || Tr.body.length > MAX_TRANSACTION_SIZE)
            return  - 1;
        
        this.CheckCreateTransactionObject(Tr)
        if(Tr.power - Math.log2(Tr.body.length / 128) < MIN_POWER_POW_TR)
            return  - 2;
        if(Tr.num !== BlockNum)
            return  - 3;
        if(Tr.body[0] === TYPE_TRANSACTION_ACC_HASH)
            return  - 4;
        
        return 1;
    }
    
    ReWriteDAppTransactions(Length)
    {
        if(!TX_PROCESS.Worker)
            return 0;
        if(!Length)
            return 0;
        
        var StartNum;
        var StateTX = DApps.Accounts.DBStateTX.Read(0);
        if(StateTX)
            StartNum = StateTX.BlockNum - Length + 1
        else
            StartNum = this.BlockNumDB - Length + 1
        
        if(StartNum < 0)
            StartNum = 0
        var EndNum = this.BlockNumDB;
        
        var MinBlock = DApps.Accounts.GetMinBlockAct();
        if(MinBlock > StartNum)
        {
            ToLog("Cant rewrite transactions. Very long length of the rewriting chain. Max length=" + (this.BlockNumDB - MinBlock))
            return 0;
        }
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ReWriteDAppTransactions", {StartNum:StartNum, EndNum:EndNum})
        
        return 1;
    }
    
    GetDAppTransactions(BlockNum)
    {
        if(BlockNum % PERIOD_ACCOUNT_HASH !== 0)
            return undefined;
        
        var BlockNumHash = BlockNum - DELTA_BLOCK_ACCOUNT_HASH;
        if(BlockNumHash < 0)
            return undefined;
        
        var Item = DApps.Accounts.GetAccountHashItem(BlockNumHash);
        if(Item)
        {
            var Body = [TYPE_TRANSACTION_ACC_HASH];
            WriteUintToArr(Body, BlockNumHash)
            WriteArrToArr(Body, Item.AccHash, 32)
            if(BlockNumHash >= START_BLOCK_ACCOUNT_HASH3)
            {
                WriteUintToArr(Body, Item.AccountMax)
                WriteArrToArr(Body, Item.SmartHash, 32)
                WriteUintToArr(Body, Item.SmartCount)
                WriteUintToArr(Body, BlockNum)
                WriteUintToArr(Body, 0)
            }
            
            var Tx = {body:Body};
            return Tx;
        }
        return undefined;
    }
    AddDAppTransactions(BlockNum, Arr)
    {
        var Tx = this.GetDAppTransactions(BlockNum);
        if(Tx)
        {
            this.CheckCreateTransactionObject(Tx)
            Arr.unshift(Tx)
        }
    }
    
    AddTransactionOwn(Tr)
    {
        
        if(global.TX_PROCESS.Worker)
        {
            var StrHex = GetHexFromArr(sha3(Tr.body, 38));
            global.TX_PROCESS.Worker.send({cmd:"FindTX", TX:StrHex})
        }
        
        return this.AddTransaction(Tr, 1);
    }
    AddToSenderMap(Block)
    {
        if(!global.START_SERVER)
            return;
        
        var BlockNum = Block.BlockNum;
        var StrBlockHash = GetHexFromArr(Block.Hash);
        this.SenderBlockHashMap[BlockNum] = StrBlockHash
        
        var arr = Block.arrContent;
        if(arr)
        {
            for(var i = 0; i < arr.length; i++)
            {
                var type = arr[i][0];
                var App = DAppByType[type];
                if(App)
                {
                    var Body = arr[i];
                    var SenderNum = App.GetSenderNum(BlockNum, Body);
                    if(SenderNum < 0)
                        continue;
                    
                    var ItemArr = this.SenderMap[SenderNum];
                    if(!ItemArr)
                    {
                        ItemArr = []
                        this.SenderMap[SenderNum] = ItemArr
                    }
                    
                    ItemArr.push({BlockNum:BlockNum, StrHash:StrBlockHash})
                }
            }
        }
    }
    GetSenderPrioritet(BlockNum, SenderNum)
    {
        
        if(!global.START_SERVER)
            return 0;
        
        if(!this.WasReloadSenderMapFromDB)
            this.ReloadSenderMapFromDB()
        
        if(SenderNum < 0)
            return MAX_LENGTH_SENDER_MAP;
        
        var MaxBlockNum = BlockNum - DELTA_START_SENDER_MAP;
        if(MaxBlockNum > this.BlockNumDB)
            return MAX_LENGTH_SENDER_MAP;
        
        var ItemArr = this.SenderMap[SenderNum];
        if(!ItemArr)
        {
            return MAX_LENGTH_SENDER_MAP;
        }
        
        for(var i = ItemArr.length - 1; i--; i >= 0)
        {
            var Item = ItemArr[i];
            if(Item.BlockNum <= MaxBlockNum && this.SenderBlockHashMap[Item.BlockNum] === Item.StrHash)
            {
                var Delta = MaxBlockNum - Item.BlockNum;
                if(Delta > MAX_LENGTH_SENDER_MAP)
                    Delta = MAX_LENGTH_SENDER_MAP
                return Delta;
            }
        }
        
        return MAX_LENGTH_SENDER_MAP;
    }
    
    ReloadSenderMapFromDB()
    {
        if(!global.START_SERVER)
            return;
        
        this.SenderMap = {}
        this.SenderBlockHashMap = {}
        
        var EndNum = GetCurrentBlockNumByTime();
        var StartNum = EndNum - MAX_LENGTH_SENDER_MAP - DELTA_START_SENDER_MAP;
        if(StartNum < 0)
            StartNum = 0
        for(var Num = StartNum; Num < EndNum; Num++)
        {
            var Block = this.ReadBlockDB(Num);
            if(!Block)
                break;
            this.AddToSenderMap(Block)
        }
        this.WasReloadSenderMapFromDB = 1
    }
    
    ClearOldSenderMapItem()
    {
        if(!global.START_SERVER)
            return;
        
        var MinBlockNum = GetCurrentBlockNumByTime() - (MAX_LENGTH_SENDER_MAP + COUNT_BLOCKS_FOR_LOAD);
        var ArrForDel = [];
        for(var key in this.SenderMap)
        {
            var ItemArr = this.SenderMap[key];
            while(ItemArr.length)
            {
                var Item = ItemArr[0];
                if(Item.BlockNum > MinBlockNum)
                    break;
                ItemArr.shift()
            }
            if(ItemArr.length === 0)
                ArrForDel.push(key)
        }
        for(var i = 0; i < ArrForDel.length; i++)
        {
            var key = ArrForDel[i];
            delete this.SenderMap[key]
        }
    }
}
