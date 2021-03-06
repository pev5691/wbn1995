/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

const fs = require('fs');
const os = require('os');
var StartCheckMining = 0;
global.MiningPaused = 0;
var ProcessMemorySize = 0;
global.ArrMiningWrk = [];
var BlockMining;

function AllAlive()
{
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        ArrMiningWrk[i].send({cmd:"Alive", DELTA_CURRENT_TIME:DELTA_CURRENT_TIME});
    }
}

function ClearArrMining()
{
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        ArrMiningWrk[i].send({cmd:"Exit"});
    }
    
    ArrMiningWrk = [];
}
function RunStopPOWProcess(Mode)
{
    
    if(!GetCountMiningCPU() || GetCountMiningCPU() <= 0)
        return;
    if(!StartCheckMining)
    {
        StartCheckMining = 1;
        setInterval(RunStopPOWProcess, CHECK_RUN_MINING);
        setInterval(AllAlive, 1000);
    }
    
    if(global.NeedRestart)
        return;
    
    if(global.USE_MINING && global.MINING_START_TIME && global.MINING_PERIOD_TIME)
    {
        var Time = GetCurrentTime();
        var TimeCur = Time.getUTCHours() * 3600 + Time.getUTCMinutes() * 60 + Time.getUTCSeconds();
        
        var StartTime = GetSecFromStrTime(global.MINING_START_TIME);
        var RunPeriod = GetSecFromStrTime(global.MINING_PERIOD_TIME);
        
        var TimeEnd = StartTime + RunPeriod;
        
        global.MiningPaused = 1;
        if(TimeCur >= StartTime && TimeCur <= TimeEnd)
        {
            global.MiningPaused = 0;
        }
        else
        {
            StartTime -= 24 * 3600;
            TimeEnd -= 24 * 3600;
            if(TimeCur >= StartTime && TimeCur <= TimeEnd)
            {
                global.MiningPaused = 0;
            }
        }
        
        if(ArrMiningWrk.length && global.MiningPaused)
        {
            ToLog("------------ MINING MUST STOP ON TIME");
            ClearArrMining();
            return;
        }
        else
            if(!ArrMiningWrk.length && !global.MiningPaused)
            {
                ToLog("*********** MINING MUST START ON TIME");
            }
            else
            {
                return;
            }
    }
    else
    {
        global.MiningPaused = 0;
    }
    
    if(!global.USE_MINING || Mode === "STOP")
    {
        ClearArrMining();
        return;
    }
    
    if(global.USE_MINING && ArrMiningWrk.length)
        return;
    
    if(SERVER.LoadHistoryMode)
        return;
    
    if(GENERATE_BLOCK_ACCOUNT < 8)
        return;
    
    var PathMiner = GetCodePath("../miner.js");
    if(!fs.existsSync(PathMiner))
        PathMiner = "./process/pow-process.js";
    
    if(ArrMiningWrk.length >= GetCountMiningCPU())
        return;
    
    if(GrayConnect())
    {
        ToLog("CANNOT START MINER IN NOT DIRECT IP MODE");
        return;
    }
    
    var Memory;
    if(global.TEST_JINN)
    {
        Memory = 70 * 1e6;
    }
    else
    {
        if(global.SIZE_MINING_MEMORY)
            Memory = global.SIZE_MINING_MEMORY;
        else
        {
            Memory = os.freemem() - (800 + GetCountMiningCPU() * 80) * 1024 * 1014;
            if(Memory < 0)
            {
                ToLog("Not enough memory to start processes.");
                return;
            }
        }
    }
    
    ProcessMemorySize = Math.trunc(Memory / GetCountMiningCPU());
    ToLog("START MINER PROCESS COUNT: " + GetCountMiningCPU() + " Memory: " + ProcessMemorySize / 1024 / 1024 + " Mb for each process");
    
    for(var R = 0; R < GetCountMiningCPU(); R++)
    {
        
        let Worker = RunFork(PathMiner);
        ArrMiningWrk.push(Worker);
        Worker.Num = ArrMiningWrk.length;
        
        Worker.on('message', function (msg)
        {
            if(msg.cmd === "log")
            {
                ToLog(msg.message);
            }
            else
                if(msg.cmd === "online")
                {
                    Worker.bOnline = true;
                    ToLog("RUNNING PROCESS:" + Worker.Num + ":" + msg.message);
                }
                else
                    if(msg.cmd === "POW")
                    {
                        SERVER.MiningProcess(msg);
                    }
                    else
                        if(msg.cmd === "HASHRATE")
                        {
                            ADD_HASH_RATE(msg.CountNonce);
                        }
        });
        
        Worker.on('error', function (err)
        {
            if(!ArrMiningWrk.length)
                return;
            ToError('ERROR IN PROCESS: ' + err);
        });
        
        Worker.on('close', function (code)
        {
            ToLog("STOP PROCESS: " + Worker.Num + " pid:" + Worker.pid);
            for(var i = 0; i < ArrMiningWrk.length; i++)
            {
                if(ArrMiningWrk[i].pid === Worker.pid)
                {
                    ToLog("Delete wrk from arr - pid:" + Worker.pid);
                    ArrMiningWrk.splice(i, 1);
                }
            }
        });
    }
}

function SetCalcPOW(Block,cmd)
{
    if(!global.USE_MINING)
        return;
    
    if(!Block.Hash)
        ToLogTrace("!Block.Hash on Block=" + Block.BlockNum);
    if(!Block.PrevHash)
        ToLogTrace("!Block.PrevHash on Block=" + Block.BlockNum);
    if(!Block.SeqHash)
        ToLogTrace("!Block.SeqHash on Block=" + Block.BlockNum);
    
    if(ArrMiningWrk.length !== GetCountMiningCPU())
        return;
    if(global.POW_MAX_PERCENT > 100)
        global.POW_MAX_PERCENT = 100;
    if(global.POW_MAX_PERCENT < 0)
        global.POW_MAX_PERCENT = 0;
    
    var BlockTimeCreate = CONSENSUS_PERIOD_TIME + Date.now() - Block.BlockNum * CONSENSUS_PERIOD_TIME - global.FIRST_TIME_BLOCK + global.DELTA_CURRENT_TIME;
    
    BlockMining = Block;
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        var CurWorker = ArrMiningWrk[i];
        if(!CurWorker.bOnline)
            continue;
        CurWorker.send({cmd:cmd, BlockNum:Block.BlockNum, Account:GENERATE_BLOCK_ACCOUNT, MinerID:GENERATE_BLOCK_ACCOUNT, SeqHash:Block.SeqHash,
            Hash:Block.Hash, PrevHash:Block.PrevHash, Time:Date.now(), Num:CurWorker.Num, RunPeriod:global.POWRunPeriod, RunCount:global.POW_RUN_COUNT,
            Percent:global.POW_MAX_PERCENT, CountMiningCPU:GetCountMiningCPU(), ProcessMemorySize:ProcessMemorySize, LastNonce0:BlockTimeCreate * 0x10000,
            Meta:Block.Meta, });
    }
}

global.SetCalcPOW = SetCalcPOW;
global.RunStopPOWProcess = RunStopPOWProcess;
