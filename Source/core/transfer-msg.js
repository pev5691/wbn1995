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

const MAX_MESSAGE_COUNT = 1000;

module.exports = class CMessages extends require("./transaction-validator")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        
        this.MemPoolMsg = []
        
        for(var i = 0; i <= MAX_LEVEL_SPECIALIZATION; i++)
            this.MemPoolMsg[i] = new RBTree(CompareItemTimePow)
    }
    
    AddMsgToQuote(Msg)
    {
        
        var Tree = this.MemPoolMsg[Msg.Level];
        if(Tree)
        {
            
            if(Tree.insert(Msg))
            {
                
                if(Tree.size > MEM_POOL_MSG_COUNT)
                {
                    var maxitem = Tree.max();
                    Tree.remove(maxitem)
                    if(maxitem === Msg)
                        return 0;
                }
                return 1;
            }
            else
            {
                return 3;
            }
        }
        
        return 0;
    }
    
    IsValidMsg(Msg)
    {
        this.CheckCreateMsgHASH(Msg)
        if(Msg.power < MIN_POWER_POW_MSG)
            return  - 1;
        if(Msg.time > this.CurrentBlockNum)
            return  - 1;
        
        return 1;
    }
    
    CheckCreateMsgHASH(Msg)
    {
        if(!Msg.HashPow)
        {
            Msg.HASH = sha3(Msg.body, 27)
            Msg.HashPow = GetHashWithValues(Msg.HASH, Msg.nonce, Msg.time)
            Msg.power = GetPowPower(Msg.HashPow)
            Msg.TimePow = Msg.time + Msg.power - Math.log2(Msg.body.length / 128)
            Msg.Level = AddrLevelArr(this.addrArr, Msg.addrArr)
            if(Msg.Level >= MAX_LEVEL_SPECIALIZATION)
                Msg.Level = MAX_LEVEL_SPECIALIZATION
        }
    }
    
    CreateMsgFromBody(Body, ToAddr)
    {
        var HASH = sha3(Body, 28);
        var Msg = {HASH:HASH, body:Body, addrArr:ToAddr, nonce:CreateNoncePOWExtern(HASH, this.CurrentBlockNum, 3 * (1 << MIN_POWER_POW_MSG)),
            time:this.CurrentBlockNum, };
        this.CheckCreateMsgHASH(Msg)
        
        return Msg;
    }
    
    SendMessage(Body, ToAddr)
    {
        var Msg = this.CreateMsgFromBody(Body, ToAddr);
        this.SendMessageNext(Msg)
    }
    
    SendMessageNext(Msg)
    {
        var CountNodes = 3;
        var LevelStart = Msg.Level;
        if(CompareArr(this.addrArr, Msg.addrArr) === 0)
            return false;
        
        for(var L = LevelStart; L >= 0; L--)
            if(this.LevelNodes[L] && this.LevelNodes[L].length)
            {
                var arr = this.LevelNodes[L];
                for(var j = 0; arr && j < arr.length; j++)
                {
                    var Node = arr[j];
                    this.SendF(Node, {"Method":"MESSAGE", "Data":{Arr:[Msg]}})
                    
                    CountNodes--
                    if(CountNodes <= 0)
                        break;
                }
            }
        return true;
    }
    static
    MESSAGE_F()
    {
        return "{Arr:[{addrArr:hash,body:tr,nonce:uint,time:uint}]}";
    }
    MESSAGE(Info, CurTime)
    {
        var Data = this.DataFromF(Info);
        var arr = Data.Arr;
        for(var i = 0; i < arr.length; i++)
        {
            var Msg = arr[i];
            if(this.IsValidMsg(Msg))
            {
                if(CompareArr(this.addrArr, Msg.addrArr) === 0)
                {
                    var App = DAppByType[Msg.body[0]];
                    if(App)
                    {
                        App.OnMessage(Msg, BlockNum, i)
                    }
                }
                else
                {
                    if(this.AddMsgToQuote(Msg) === 1)
                    {
                        this.SendMessageNext(Msg)
                    }
                }
            }
        }
    }
    
    SendGetMessage(Node)
    {
        var Context = {"SendGetMessage":1};
        this.Send(Node, {"Method":"GETMESSAGE", "Context":Context, "Data":undefined})
    }
    
    GETMESSAGE(Info, CurTime)
    {
        
        var arr = [];
        var BufLength = 300;
        var Level = AddrLevelArr(this.addrArr, Info.Node.addrArr);
        var Tree = this.MemPoolMsg[Level];
        if(Tree)
        {
            var it = Tree.iterator(), Item;
            while((Item = it.next()) !== null)
            {
                if(arr.length >= MAX_MESSAGE_COUNT)
                    break;
                
                arr.push(Item)
                BufLength += Item.body.length + 50
            }
        }
        
        this.SendF(Info.Node, {"Method":"MESSAGE", "Context":Info.Context, "Data":{Arr:arr}}, BufLength)
    }
    
    AddTransaction(Tr, ToAll)
    {
        Tr.ToAll = ToAll
        var Res = this.IsValidTransaction(Tr, this.CurrentBlockNum);
        if(Res <= 0 && Res !==  - 3)
            return Res;
        
        if(Tr.num < this.CurrentBlockNum)
            return  - 3;
        
        var delta = Tr.num - this.CurrentBlockNum;
        if(delta > 3)
        {
            if(delta < 15)
            {
                let TR = Tr;
                let SELF = this;
                setTimeout(function ()
                {
                    var Res = SELF.AddTransaction(TR, TR.ToAll);
                    if(TR.ToAll)
                        ToLogClient("#3 Added " + TrName(TR) + "  for block: " + TR.num + " on timer Res=" + Res)
                }, (delta - 3) * 1000)
                if(Tr.ToAll)
                    ToLogClient("#2 Added " + TrName(Tr) + "  for block: " + Tr.num + " to timer. Send transaction after " + (delta - 3) + " sec")
                return 4;
            }
            return  - 3;
        }
        
        var Block = this.GetBlockContext(Tr.num);
        if(!Block)
            return  - 5;
        if(Block.Active)
        {
            Res =  - 3
        }
        else
        {
            Res = this.AddTrToBlockQuote(Block, Tr)
            if(Tr.ToAll)
                this.SendTransaction(Tr)
        }
        ToLogContext("#1 Add " + TrName(Tr) + " for Block: " + Tr.num + " Res=" + Res)
        
        return Res;
    }
    
    SendTransaction(Tr)
    {
        
        if(!Tr.ToAll)
            return;
        
        var CurTime = GetCurrentTime(0) - 0;
        var Count;
        if(GrayConnect())
            Count = Math.trunc(MAX_GRAY_CONNECTIONS_TO_SERVER)
        else
            Count = Math.min(this.ActualNodes.size, 16)
        if(Count < 2)
            Count = 2
        
        var ArrNodes = this.GetActualNodes();
        for(var i = 0; i < ArrNodes.length; i++)
        {
            var Node = ArrNodes[i];
            if(!Node)
                continue;
            
            if(Node.TaskLastSendTx)
            {
                var Delta = CurTime - Node.TaskLastSendTx;
                if(Delta < global.PERIOD_GET_BLOCK)
                {
                    continue;
                }
            }
            
            Node.TaskLastSendTx = CurTime
            this.SendF(Node, {"Method":"TRANSACTION", "Data":Tr}, Tr.body.length + 1000)
            
            ToLogContext("Send " + TrName(Tr) + " to " + NodeName(Node))
            Count--
            if(Count <= 0)
                break;
        }
    }
    
    static
    
    TRANSACTION_F()
    {
        return "{body:tr}";
    }
    
    TRANSACTION(Info, CurTime)
    {
        var Tr = this.DataFromF(Info);
        ToLogContext("Receive " + TrName(Tr) + " from " + NodeName(Info.Node))
        this.AddTransaction(Tr, 0)
    }
};
function ToLogContext(Str)
{
    ToLog(Str, 3);
}
function TrName(Tr)
{
    if(!Tr.HASH)
        SERVER.CheckCreateTransactionObject(Tr);
    
    var Str = GetHexFromArr(Tr.HASH);
    return "Tx:" + Str.substr(0, 8);
}
global.TrName = TrName;
