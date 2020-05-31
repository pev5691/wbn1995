/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"NetCache"});


//Engine context



global.glUseBlockCache = 1;
global.glUsePackMaxHash = 1;

function DoNode(Engine)
{
    var LastBlockNum = Engine.CurrentBlockNum;
    var BlockNum = LastBlockNum - JINN_CONST.STEP_CLEAR_MEM;
    if(Engine.CacheLastCurBlockNum === BlockNum)
        return;
    Engine.CacheLastCurBlockNum = BlockNum;
    
    Engine.NetCacheClear(BlockNum);
}

function InitClass(Engine)
{
    Engine.ProcessBlockOnSend = function (Child,Block,TxData)
    {
        var BlockNum = Block.BlockNum;
        var DeltaBlockNum = Engine.CurrentBlockNum - BlockNum;
        
        var bFullData = 0;
        if(DeltaBlockNum >= JINN_CONST.STEP_CLEAR_MEM - JINN_CONST.MAX_DELTA_PROCESSING)
        {
            bFullData = 1;
        }
        else
        {
            for(var i = 0; i < TxData.length; i++)
            {
                var Tx = TxData[i];
                if(!Tx || !Tx.TTReceiveIndex || !Tx.TTReceiveIndex[Child.Level] || !GetBit(Tx.TXSend, Child.Level))
                {
                    bFullData = 1;
                    break;
                }
            }
        }
        
        var Size = 0;
        var TxArr = [];
        var TxRaw = [];
        
        if(bFullData)
        {
            for(var i = 0; i < TxData.length; i++)
            {
                var Tx = TxData[i];
                TxRaw.push(Tx);
                Size += Tx.body.length;
            }
        }
        else
        {
            for(var i = 0; i < TxData.length; i++)
            {
                var Tx = TxData[i];
                var TTIndex = Tx.TTReceiveIndex[Child.Level];
                if(!TTIndex)
                {
                    ToLogOne("Not found TTIndex on Block=" + Block.BlockNum, " KEY: " + Tx.KEY);
                }
                
                TxArr.push(TTIndex - 1);
            }
            Size = TxArr.length * 2;
        }
        Block.TxArr = TxArr;
        Block.TxRaw = TxRaw;
        
        return Size;
    };
    
    Engine.ProcessBlockOnReceive = function (Child,Block,bTest)
    {
        var BlockNum = Block.BlockNum;
        Block.TxData = [];
        if(Block.TxRaw.length)
        {
            for(var i = 0; i < Block.TxRaw.length; i++)
            {
                var Value = Block.TxRaw[i];
                var Tx = Engine.GetTx(Value.body);
                Block.TxData.push(Tx);
                
                CheckTx("" + Engine.ID + ". #1 ProcessBlockOnReceive", Tx, BlockNum);
            }
        }
        else
            if(Block.TxArr.length)
            {
                var ArrTTAll = Engine.GetArrTicketAll(BlockNum);
                
                var TxArr = Block.TxArr;
                for(var i = 0; i < TxArr.length; i++)
                {
                    var TTIndex = TxArr[i];
                    
                    var Tx = ArrTTAll[TTIndex];
                    if(!Tx || !Tx.IsTx)
                    {
                        Child.ToError("Error tx index = " + TTIndex);
                        return 0;
                    }
                    
                    Block.TxData.push(Tx);
                }
            }
        
        delete Block.TxArr;
        delete Block.TxRaw;
        
        return 1;
    };
    Engine.GetPackedArray = function (Arr)
    {
        var Arr2 = [];
        
        var Counter = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Value = Arr[i];
            var Value2 = Arr[i + 1];
            
            Counter++;
            if(Counter < 60 && Value === Value2)
            {
            }
            else
            {
                Counter--;
                Arr2.push(Value * 60 + Counter);
                Counter = 0;
            }
        }
        return Arr2;
    };
    Engine.GetUnpackedArray = function (Arr)
    {
        var Arr2 = [];
        for(var i = 0; i < Arr.length; i++)
        {
            var Value = (Arr[i] / 60) >>> 0;
            var Count = 1 + (Arr[i] % 60);
            
            for(var n = 0; n < Count; n++)
                Arr2.push(Value);
        }
        return Arr2;
    };
    Engine.GetPackedSeqArray = function (Arr)
    {
        Arr.sort(function (a,b)
        {
            return a - b;
        });
        var Arr2 = [];
        
        var Counter = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Value = Arr[i];
            var Value2 = Arr[i + 1];
            
            Counter++;
            if(Value + 1 === Value2)
            {
            }
            else
            {
                Arr2.push(Value - Counter + 1);
                Arr2.push(Counter);
                
                Counter = 0;
            }
        }
        return Arr2;
    };
    Engine.GetUnpackedSeqArray = function (Arr)
    {
        
        var Arr2 = [];
        if(Arr.length / 2 === (Arr.length >> 1))
        {
            for(var i = 0; i < Arr.length; i += 2)
            {
                var Value = Arr[i];
                var Count = Arr[i + 1];
                for(var n = 0; n < Count; n++)
                    Arr2.push(Value + n);
            }
        }
        
        return Arr2;
    };
    
    Engine.FindMaxArrItem = function (Arr,Find)
    {
        for(var n = 0; n < Arr.length; n++)
        {
            var Item = Arr[n];
            if(Item && FMaxTreeCompare(Item, Find, 1) === 0)
                return n;
        }
        return  - 1;
    };
    
    Engine.AddItemToRepeatArr = function (Arr,Index,Item)
    {
    };
    
    Engine.ProcessMaxHashOnSend = function (Child,BlockNum,Arr,ArrRepeat)
    {
        if(!glUsePackMaxHash)
            return;
        
        if(!Child.LastSendArrMax)
        {
            Child.LastSendArrIndex = 0;
            Child.LastSendArrMax = [];
        }
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            
            var FindNum = Engine.FindMaxArrItem(Child.LastSendArrMax, Status);
            if(FindNum !==  - 1)
            {
                ArrRepeat.push(FindNum);
                Arr.splice(a, 1);
                a--;
            }
        }
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            
            Child.LastSendArrIndex++;
            Engine.AddItemToRepeatArr(Child.LastSendArrMax, Child.LastSendArrIndex, Status);
            if(Status.LoadH && IsEqArr(Status.LoadH, Status.Hash))
            {
                Status.Mode |= 128;
                Status.LoadH = ZERO_ARR_32;
            }
        }
    };
    
    Engine.ProcessMaxHashOnReceive = function (Child,BlockNum,Arr,ArrRepeat)
    {
        if(!glUsePackMaxHash)
            return 1;
        if(!Child.LastReceiveArrMax)
        {
            Child.LastReceiveArrIndex = 0;
            Child.LastReceiveArrMax = [];
        }
        
        for(var n = 0; n < ArrRepeat.length; n++)
        {
            var Index = ArrRepeat[n];
            var Item = Child.LastReceiveArrMax[Index];
            if(!Item)
            {
                continue;
            }
            Item.Repeat = 1;
            Arr.push(Item);
        }
        
        for(var a = 0; a < Arr.length; a++)
        {
            var Status = Arr[a];
            if(!Status.Repeat)
            {
                Child.LastReceiveArrIndex++;
                Engine.AddItemToRepeatArr(Child.LastReceiveArrMax, Child.LastReceiveArrIndex, Status);
            }
            if(Status.Mode & 128)
            {
                Status.Mode ^= 128;
                Engine.CalcHashMaxLider(Status, BlockNum);
                Status.LoadH = Status.Hash;
            }
        }
        return 1;
    };
    
    Engine.InitChildNext = function (Child)
    {
        Child.SendBodyTimeCache = new CTimeCache(function (a,b)
        {
            return CompareArr(a.Hash, b.Hash);
        });
    };
    
    Engine.ClearChild = function (Child)
    {
        
        if(Child.SendBodyTimeCache)
        {
            Child.SendBodyTimeCache.Clear();
            global.AllCacheTreeRemoveItem(Child.SendBodyTimeCache);
            delete Child.SendBodyTimeCache;
        }
        if(Child.SendMaxTimeCache)
        {
            Child.SendMaxTimeCache.Clear();
            global.AllCacheTreeRemoveItem(Child.SendMaxTimeCache);
            delete Child.SendMaxTimeCache;
        }
    };
    Engine.NetCacheClear = function (LastBlockNum)
    {
        
        global.AllCacheTreeRemoveTo(LastBlockNum);
        ClearListTree(Engine.ListTreeTx, LastBlockNum);
        ClearListTree(Engine.ListTreeTicket, LastBlockNum);
        ClearListTree(Engine.ListTreeTicketAll, LastBlockNum);
        ClearListMap(Engine.ListArrTicketAll, LastBlockNum, function (Arr)
        {
            for(var i = 0; i < Arr.length; i++)
            {
                var Tx = Arr[i];
                if(Tx.TTReceiveIndex)
                {
                    delete Tx.TTReceiveIndex;
                    delete Tx.TXSend;
                }
            }
        });
        
        ClearListMap(Engine.MaxLiderList, LastBlockNum);
    };
    function ClearListMap(Map,LastBlockNum,FClear)
    {
        if(!Map)
            return;
        for(var key in Map)
        {
            var BlockNum =  + key;
            if(BlockNum > LastBlockNum)
                continue;
            if(FClear)
            {
                FClear(Map[key]);
            }
            delete Map[key];
        }
    };
    function ClearListTree(TreeMap,LastBlockNum)
    {
        ClearListMap(TreeMap, LastBlockNum, function (Tree)
        {
            Tree.clear();
        });
    };
}
