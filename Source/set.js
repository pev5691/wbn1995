
global.DATA_PATH="../DATA";
global.CODE_PATH=process.cwd();

require("./core/constant");
require("./core/library");

CheckCreateDir(global.DATA_PATH);

if(!global.NET_WORK_MODE)
    InitNetWorkMode();

InitParamsArg();



SAVE_CONST(true);


process.exit();


function InitNetWorkMode()
{
    var StartIP="";
    if(global.LOCAL_RUN)
        StartIP=global.LISTEN_IP;
    else
        StartIP=global.START_IP;

    global.NET_WORK_MODE=
        {
            ip:StartIP,
            port:global.START_PORT_NUMBER,
            UseDirectIP: true,
            NOT_RUN:0
        };

    //но метод DetectGrayMode не будет больше работать....
}

