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

const OBJECT_FORMAT_TRANSFER2 = {Version:"uint16", TransferTx:[{BlockNum:"uint", TxArray:[{body:"tr"}]}], TransferPOW:[{BlockNum:"uint",
        Hash:[{SeqHash:"hash", AddrHash:"hash"}]}], Slots:{BlockNum:"uint", State:[{DeltaHeaderNum:"uint16", DeltaBlockNum:"uint16"}],
        Hash:[{Num:"byte", SeqHash:"hash", AddrHash:"hash"}], HistoryHeads:[{Num:"byte", BlockNum:"uint", SeqHash:"hash", AddrHash:"hash"}],
        HistoryBits:[{Num:"byte", BlockNum:"uint", Bits:["byte"]}], HistoryTxs:[{BlockNum:"uint", TxArray:[{body:"tr"}]}], }};
var FORMAT_DATA_TRANSFER2 = BufLib.GetFormatFromObject(OBJECT_FORMAT_TRANSFER2);

module.exports = class CConsensus2 extends require("./block-loader")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    }
    
    OnStartSecond()
    {
        if(!this.CanSend)
            return;
        
        PrepareStatEverySecond()
        this.AddStatOnTimer()
        
        if(global.PROTOCOL_VER === 2)
        {
            this.DoBlockChain()
        }
        else
        {
            this.DoBlockChain()
        }
    }
    
    DoTransfer()
    {
        
        if(glStopNode)
            return;
        if(!CAN_START)
            return;
        
        if(global.PROTOCOL_VER === 2)
        {
            this.DoTransfer2()
        }
        else
        {
            this.DoTransfer0()
        }
    }
    
    DoBlockChain2()
    {
        
        if(glStopNode)
            return;
        if(!CAN_START)
            return;
        
        this.StartConsensus()
        var CURRENTBLOCKNUM = this.CurrentBlockNum;
        
        if(GrayConnect())
        {
            if(!this.LoadHistoryMode)
                this.StartSyncBlockchain(undefined, 1)
            return;
        }
        if(this.LoadHistoryMode)
            return;
        
        var bWasSave = false;
        var LoadBlockNum;
        var LoadHash;
        var start_save = CURRENTBLOCKNUM + TIME_START_SAVE;
        
        for(var BlockNum = CURRENTBLOCKNUM - BLOCK_PROCESSING_LENGTH2; BlockNum > BLOCK_PROCESSING_LENGTH2 && BlockNum < CURRENTBLOCKNUM; BlockNum++)
        {
            var Block = this.GetBlock(BlockNum);
        }
    }
    
    TRANSFER2(Info, CurTime)
    {
    }
    static
    TRANSFER2_F()
    {
        return FORMAT_DATA_TRANSFER2;
    }
    
    DoTransfer2()
    {
        var MaxPOWList;
        var MaxSumList;
        var start = this.CurrentBlockNum - BLOCK_PROCESSING_LENGTH;
        var finish = this.GetLastCorrectBlockNum();
        
        for(var b = start; b <= finish; b++)
        {
            var Block = this.GetBlock(b);
            if(!Block)
                continue;
            if(Block.StartLevel === undefined || Block.MLevelSend === undefined)
                continue;
            if(!Block.Active)
                continue;
            
            if(Block.MLevelSend < 0)
            {
                this.CheckEndExchange(Block)
                continue;
            }
            if(Block.EndExchange)
                continue;
            
            var Transfer = Block.LevelsTransfer[Block.MLevelSend];
            if(!Transfer.WasSend)
            {
                if(!MaxPOWList)
                {
                    MaxPOWList = this.GetMaxPOWList()
                    MaxSumList = this.GetMaxSumList()
                }
                
                var ArrT = this.GetArrayFromTxTree(Block);
                
                this.SendDataTransfer(Transfer, ArrT, MaxPOWList, MaxSumList, Block)
            }
            Transfer.WasSend = true
            var bNext = Transfer.WasGet;
            if(!bNext)
            {
                var CurTimeNum = GetCurrentTime(Block.DELTA_CURRENT_TIME) - 0;
                var DeltaTime = CurTimeNum - Block.StartTimeNum;
                
                if(DeltaTime > Transfer.MustDeltaTime)
                {
                    bNext = true
                    Block.ErrRun = "" + Transfer.LocalLevel + " " + Block.ErrRun
                    
                    for(var Addr in Transfer.TransferNodes)
                    {
                        var Item = Transfer.TransferNodes[Addr];
                        
                        ADD_TO_STAT("TRANSFER_TIME_OUT")
                        this.AddCheckErrCount(Item.Node, 1, "TRANSFER_TIME_OUT")
                    }
                    
                    ADD_TO_STAT("TimeOutLevel")
                }
            }
            
            if(bNext)
            {
                
                if(Block.MLevelSend === 0)
                {
                    Block.EndExchangeTime = Date.now()
                    this.CheckEndExchange(Block)
                }
                Block.MLevelSend--
            }
        }
    }
};
