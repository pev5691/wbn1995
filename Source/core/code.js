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

var fs = require("fs");



module.exports = class CCode extends require("./base")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        
        if(!global.ADDRLIST_MODE && !this.VirtualMode || global.TEST_JINN)
        {
            setInterval(this.CheckLoadCodeTime.bind(this), 10 * 1000)
        }
        
        this.LastEvalCodeNum = 0
        
        CheckCreateDir(GetDataPath("Update"))
    }
    CheckLoadCodeTime()
    {
        if(START_LOAD_CODE.StartLoadNode && START_LOAD_CODE.StartLoadVersionNum)
        {
            var Delta = new Date() - START_LOAD_CODE.StartLoadVersionNumTime;
            if(Delta > 20 * 1000)
            {
                ToError("Cannot load code version:" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + START_LOAD_CODE.StartLoadNode.ip + ":" + START_LOAD_CODE.StartLoadNode.port)
                this.ClearLoadCode()
            }
        }
    }
    ClearLoadCode()
    {
        START_LOAD_CODE.StartLoad = undefined
        START_LOAD_CODE.StartLoadVersionNum = 0
        START_LOAD_CODE.StartLoadVersionNumTime = 0
    }
    
    StartLoadCode(Node, CodeVersion)
    {
        
        var VersionNum = CodeVersion.VersionNum;
        
        START_LOAD_CODE.StartLoad = CodeVersion
        START_LOAD_CODE.StartLoadNode = Node
        START_LOAD_CODE.StartLoadVersionNum = VersionNum
        START_LOAD_CODE.StartLoadVersionNumTime = new Date()
        
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(fs.existsSync(fname))
        {
            this.UseCode(VersionNum, false)
        }
        else
        {
            this.StartGetNewCode(Node, VersionNum)
        }
    }
    
    DownloadingNewCodeToPath(Node, Data, VersionNum)
    {
        var fname = GetDataPath("Update/wallet-" + VersionNum + ".zip");
        if(!fs.existsSync(fname))
        {
            var Hash = shaarr(Data);
            if(CompareArr(Hash, START_LOAD_CODE.StartLoad.Hash) === 0)
            {
                var file_handle = fs.openSync(fname, "w");
                fs.writeSync(file_handle, Data, 0, Data.length)
                fs.closeSync(file_handle)
                
                this.UseCode(VersionNum, global.USE_AUTO_UPDATE)
                
                return 1;
            }
            else
            {
                ToError("Error check hash of version code :" + START_LOAD_CODE.StartLoadVersionNum + " from node: " + Node.ip + ":" + Node.port)
                this.ClearLoadCode()
                return 0;
            }
        }
        return 1;
    }
    
    UseCode(VersionNum, bUpdate)
    {
        if(bUpdate)
        {
            UpdateCodeFiles(VersionNum)
        }
        
        if(global.START_LOAD_CODE.StartLoad)
        {
            global.CODE_VERSION = START_LOAD_CODE.StartLoad
            this.ClearLoadCode()
        }
    }
    
    SetNewCodeVersion(Data, PrivateKey)
    {
        
        var fname = GetDataPath("ToUpdate/wallet.zip");
        if(fs.existsSync(fname))
        {
            var fname2 = GetDataPath("Update/wallet-" + Data.VersionNum + ".zip");
            if(fs.existsSync(fname2))
            {
                fs.unlinkSync(fname2)
            }
            
            var data = fs.readFileSync(fname);
            var Hash = shaarr(data);
            
            var file_handle = fs.openSync(fname2, "w");
            fs.writeSync(file_handle, data, 0, data.length)
            fs.closeSync(file_handle)
            
            var SignArr = arr2(Hash, GetArrFromValue(Data.VersionNum));
            var Sign = secp256k1.sign(SHA3BUF(SignArr), PrivateKey).signature;
            global.CODE_VERSION = Data
            global.CODE_VERSION.Hash = Hash
            global.CODE_VERSION.Sign = Sign
            return "OK Set new code version=" + Data.VersionNum;
        }
        else
        {
            return "File not exist: " + fname;
        }
    }
    StartGetNewCode(Node, VersionNum)
    {
        var Context = {"VersionNum":VersionNum};
        this.SendF(Node, {"Method":"GETCODE", "Context":Context, "Data":VersionNum})
    }
    static
    GETCODE_F()
    {
        return "uint";
    }
    RETCODE(Info)
    {
        
        var VersionNum = Info.Context.VersionNum;
        if(!VersionNum || !START_LOAD_CODE.StartLoad)
            return;
        
        if(!this.DownloadingNewCodeToPath(Info.Node, Info.Data, VersionNum))
            this.AddCheckErrCount(Info.Node, 1, "Error check hash of version code")
    }
};

function UpdateCodeFiles(StartNum)
{
    var fname = GetDataPath("Update");
    if(!fs.existsSync(fname))
        return 0;
    
    var arr = fs.readdirSync(fname);
    var arr2 = [];
    for(var i = 0; i < arr.length; i++)
    {
        if(arr[i].substr(0, 7) === "wallet-")
        {
            arr2.push(parseInt(arr[i].substr(7)));
        }
    }
    arr2.sort(function (a,b)
    {
        return a - b;
    });
    
    for(var i = 0; i < arr2.length; i++)
    {
        var Num = arr2[i];
        var Name = "wallet-" + Num + ".zip";
        var Path = fname + "/" + Name;
        
        ToLog("Check file:" + Name);
        
        if(fs.existsSync(Path))
        {
            if(StartNum === Num)
            {
                ToLog("UnpackCodeFile:" + Name);
                UnpackCodeFile(Path);
                
                if(StartNum % 2 === 0)
                {
                    global.RestartNode(1);
                }
                else
                {
                }
                
                return 1;
            }
            else
            {
                ToLog("Delete old file update:" + Name);
                fs.unlinkSync(Path);
            }
        }
    }
    
    return 0;
}

global.UnpackCodeFile = UnpackCodeFile;
function UnpackCodeFile(fname)
{
    
    var data = fs.readFileSync(fname);
    var reader = ZIP.Reader(data);
    
    reader.forEach(function (entry)
    {
        var Name = entry.getName();
        var Path = GetCodePath(Name);
        
        if(entry.isFile())
        {
            
            var buf = entry.getData();
            CheckCreateDir(Path, true, true);
            
            var file_handle = fs.openSync(Path, "w");
            fs.writeSync(file_handle, buf, 0, buf.length);
            fs.closeSync(file_handle);
        }
        else
        {
        }
    });
    reader.close();
}

global.RestartNode = function RestartNode(bForce)
{
    global.NeedRestart = 1;
    setTimeout(DoExit, 5000);
    
    if(global.nw || global.NWMODE)
    {
    }
    else
    {
        StopChildProcess();
        ToLog("********************************** FORCE RESTART!!!");
        return;
    }
    
    if(this.ActualNodes)
    {
        var it = this.ActualNodes.iterator(), Node;
        while((Node = it.next()) !== null)
        {
            if(Node.Socket)
                CloseSocket(Node.Socket, "Restart");
        }
    }
    
    SERVER.StopServer();
    SERVER.StopNode();
    StopChildProcess();
    
    ToLog("****************************************** RESTART!!!");
    ToLog("EXIT 1");
}

function DoExit()
{
    ToLog("EXIT 2");
    if(global.nw || global.NWMODE)
    {
        ToLog("RESTART NW");
        
        var StrRun = '"' + process.argv[0] + '" --user-data-dir="..\\DATA\\Local" .\n';
        StrRun += StrRun;
        SaveToFile("run-next.bat", StrRun);
        
        const child_process = require('child_process');
        child_process.exec("run-next.bat", {shell:true});
    }
    
    ToLog("EXIT 3");
    process.exit(0);
}

function GetRunLine()
{
    var StrRun = "";
    for(var i = 0; i < process.argv.length; i++)
        StrRun += '"' + process.argv[i] + '" ';
    return StrRun;
}
