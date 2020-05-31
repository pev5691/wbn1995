/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
module.exports.Init = Init;

function Init(Engine)
{
    
    SERVER.CheckOnStartComplete = 1;
    
    SERVER.BlockNumDBMin = 0;
    Object.defineProperty(SERVER, "BlockNumDB", {set:function (x)
        {
        }, get:function (x)
        {
            return Engine.GetMaxNumBlockDB();
        }, });
    
    SERVER.AddTransaction = function (Tr,ToAll)
    {
        var Tx = Engine.GetTx(Tr.body);
        
        if(!Engine.IsValidateTx(Tx, "ERROR SERVER.AddTransaction", Tx.num))
            return  - 4;
        
        var CurBlockNumT = Engine.CurrentBlockNum;
        
        if(Tx.num < CurBlockNumT)
            return  - 3;
        if(Tx.num > CurBlockNumT + 20)
            return  - 5;
        
        var TxArr = [Tx];
        Engine.AddCurrentProcessingTx(Tx.num, TxArr);
        
        return 1;
    };
    let CloseOld = SERVER.Close.bind(SERVER);
    SERVER.ClearDataBase = function ()
    {
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ClearDataBase", {});
        
        Engine.ClearDataBase();
    };
    SERVER.Close = function ()
    {
        CloseOld();
        Engine.Close();
    };
    
    SERVER.WriteBlockDB = function (Block)
    {
        Engine.ConvertFromTera(Block, 1);
        return Engine.SaveToDB(Block);
    };
    SERVER.WriteBlockHeaderDB = function (Block,bPreSave)
    {
        Engine.ConvertFromTera(Block);
        return Engine.SaveToDB(Block);
    };
    
    SERVER.ReadBlockDB = function (BlockNum)
    {
        var Block = Engine.GetBlockDB(BlockNum);
        Engine.ConvertToTera(Block, 1);
        return Block;
    };
    
    SERVER.CheckLoadBody = function (Block)
    {
        Engine.CheckLoadBody(Block);
        Engine.ConvertToTera(Block, 1);
    };
    
    SERVER.ReadBlockHeaderDB = function (BlockNum)
    {
        var Block = Engine.GetBlockHeaderDB(BlockNum);
        Engine.ConvertToTera(Block, 0);
        return Block;
    };
    SERVER.ReadBlockHeaderFromMapDB = SERVER.ReadBlockHeaderDB;
    
    SERVER.TruncateBlockDB = function (LastNum)
    {
        var Result = Engine.TruncateChain(LastNum);
        
        return Result;
    };
    
    SERVER.GetMaxNumBlockDB = function ()
    {
        return Engine.GetMaxNumBlockDB();
    };
    
    SERVER.FindStartBlockNum222 = function ()
    {
        return Engine.GetMaxNumBlockDB();
    };
    
    function ErrorAPICall()
    {
        ToLogTrace("Error API call");
        return 0;
    };
    
    function ErrorTODO()
    {
        ToLogTrace("TODO");
        return 0;
    };
    
    SERVER.WriteBlockDBFinaly = ErrorAPICall;
    SERVER.WriteBodyDB = ErrorAPICall;
    
    SERVER.WriteBodyResultDB = ErrorTODO;
    
    SERVER.CreateGenesisBlocks = function ()
    {
    };
    SERVER.CheckStartedBlocks = function ()
    {
        var CurNumTime = GetCurrentBlockNumByTime();
        if(SERVER.BlockNumDB > CurNumTime)
        {
            SERVER.TruncateBlockDB(CurNumTime);
        }
        var BlockNum = SERVER.CheckBlocksOnStartReverse(SERVER.BlockNumDB);
        ToLog("CheckStartedBlocks...");
        BlockNum = SERVER.CheckBlocksOnStartFoward(BlockNum - 10000, 0);
        
        if(BlockNum < SERVER.BlockNumDB)
        {
            BlockNum--;
            ToLog("******************************** SET NEW BlockNumDB = " + BlockNum + "/" + SERVER.BlockNumDB);
            SERVER.TruncateBlockDB(BlockNum);
        }
        global.glStartStat = 1;
    };
    
    SERVER.GetLinkHash = ErrorAPICall;
    SERVER.GetLinkHashDB = ErrorAPICall;
    
    global.ON_USE_CONST = function ()
    {
        global.JINN_WARNING =  + global.LOG_LEVEL;
        
        if(global.WEB_PROCESS)
            global.WEB_PROCESS.UpdateConst = 1;
    };
    
    Engine.ChildIDCounter = 10000;
    Engine.SetChildID = function (Child)
    {
        Engine.ChildIDCounter++;
        Child.ID = Engine.ChildIDCounter;
    };
    SERVER.ConnectToAll = function ()
    {
        var Count = 0;
        
        var Map = {};
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(Child)
            {
                Map[Child.ID] = 1;
            }
        }
        
        var it = Engine.NodesTree.iterator(), AddrItem;
        while((AddrItem = it.next()) !== null)
        {
            if(Map[AddrItem.ID])
                continue;
            
            Engine.InitAddrItem(AddrItem);
            
            var Power = Engine.GetAddrPower(AddrItem.AddrHashPOW, AddrItem.BlockNum);
            if(AddrItem.System || global.MODELING)
                Power += MIN_POW_ADDRES;
            
            if(Power < global.MIN_POW_ADDRES / 2)
                continue;
            
            var Child = Engine.RetNewConnectByAddr(AddrItem);
            
            if(Engine.SendConnectReq(Child))
                Count++;
        }
        
        ToLog("Connect to " + Count + " nodes");
    };
    
    Object.defineProperty(SERVER, "ip", {get:function ()
        {
            return Engine.ip;
        }});
    Object.defineProperty(SERVER, "port", {get:function ()
        {
            return Engine.port;
        }});
    Engine.OnSetTimeDelta = function (DeltaTime)
    {
        SAVE_CONST(0);
    };
    Engine.OnSetOwnIP = function (ip)
    {
        global.JINN_IP = ip;
        SAVE_CONST(1);
    };
    
    ON_USE_CONST();
}
