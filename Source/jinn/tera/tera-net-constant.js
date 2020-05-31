/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
/**
 *
 * The module is designed for exchanging network constants
 *
 **/

module.exports.Init = Init;

const FORMAT_NET_CONSTANT = {NetConstVer:"uint", NetConstStartNum:"uint", PROTOCOL_MODE:"uint", MAX_TRANSACTION_COUNT:"uint16",
    __RESRV00:"uint", MIN_COUNT_FOR_CORRECT_TIME:"uint", CORRECT_TIME_TRIGGER:"uint16", CORRECT_TIME_VALUE:"uint16", INFLATION_TIME_VALUE:"byte",
    __RESRV01:"uint", MAX_LEADER_COUNT:"byte", MAX_ITEMS_FOR_LOAD:"uint32", MAX_PACKET_SIZE:"uint32", MAX_PACKET_SIZE_RET_DATA:"uint32",
    MAX_BLOCK_SIZE:"uint32", __RESRV02:"uint", MAX_ERR_PROCESS_COUNT:"uint", RECONNECT_MIN_TIME:"uint", MAX_LEVEL_CONNECTION:"byte",
    EXTRA_SLOTS_COUNT:"byte", MAX_CONNECT_TIMEOUT:"uint32", __RESRV03:"uint", MAX_LEVEL_NODES:"byte", MAX_RET_NODE_LIST:"uint16",
    MAX_CACHE_BODY_LENGTH:"uint32", MAX_DEPTH_FOR_SECONDARY_CHAIN:"uint32", MAX_DELTA_PROCESSING:"byte", METHOD_ALIVE_TIME:"uint32",
    __RESRV04:"uint", STEP_ADDTX:"byte", STEP_TICKET:"byte", STEP_TX:"byte", STEP_NEW_BLOCK:"byte", STEP_CALC_POW_LAST:"byte",
    STEP_CALC_POW_FIRST:"byte", STEP_SAVE:"byte", STEP_LAST:"byte", STEP_CLEAR_MEM:"byte", _ReservT1:"byte", _ReservT2:"uint",
    _ReservT3:"uint", _ReservT4:"byte", _ReservT5:"uint", UNIQUE_IP_MODE:"uint16", CHECK_POINT_NUM:"uint", CHECK_POINT_HASH:"hash",
    __RESRV05:"uint", TEST_MODE_DOUBLE_TX:"uint32", TEST_COUNT_BLOCK:"uint32", TEST_COUNT_TX:"uint32", TEST_MODE4:"uint32", TEST_MODE5:"uint32",
    TEST_MODE6:"uint32", RESERVE_DATA:"arr370", NET_SIGN:"arr64"};

var FormatForSign = CopyNetConstant({}, FORMAT_NET_CONSTANT, 1);

function Init(Engine)
{
    global.JINN_NET_CONSTANT = CopyNetConstant({}, JINN_CONST);
    JINN_NET_CONSTANT.NetConstVer = 0;
    JINN_NET_CONSTANT.NetConstStartNum = 0;
    
    Engine.NETCONSTANT_SEND = {NetConstVer:"uint"};
    Engine.NETCONSTANT_RET = FORMAT_NET_CONSTANT;
    
    Engine.ProcessNetConstant = function (Child,NetConstVer)
    {
        Child.NetConstVer = NetConstVer;
        if(NetConstVer > JINN_NET_CONSTANT.NetConstVer)
        {
            Engine.StartGetNetConstant(Child, NetConstVer);
        }
    };
    
    Engine.StartGetNetConstant = function (Child,Version)
    {
        if(Version > GetCurrentBlockNumByTime() + 3000)
            return;
        
        var Delta = Date.now() - Child.LastGetNetConstant;
        if(Delta < 15000)
            return;
        
        Child.LastGetNetConstant = Date.now();
        
        Engine.Send("NETCONSTANT", Child, {NetConstVer:Version}, function (Child,Data)
        {
            if(!Data)
                return;
            
            Child.LastGetNetConstant = Date.now();
            
            if(Data.NetConstVer > JINN_NET_CONSTANT.NetConstVer)
            {
                if(!Engine.CheckNetConstant(Data))
                {
                    Engine.AddCheckErrCount(Child, 1, "Error check sign net const: " + Data.NetConstVer, 1);
                }
            }
        });
    };
    
    Engine.NETCONSTANT = function (Child,Data)
    {
        var RetData = CopyNetConstant({}, JINN_NET_CONSTANT);
        return RetData;
    };
    
    Engine.CheckNetConstant = function (Data)
    {
        if(!Data)
            return;
        
        var SignArr = Engine.GetSignCheckNetConstant(Data);
        if(!CheckDevelopSign(SignArr, Data.NET_SIGN))
        {
            return 0;
        }
        
        var CurBlockNum = GetCurrentBlockNumByTime();
        var Delta = Data.NetConstStartNum - CurBlockNum;
        if(Delta < 1)
            Delta = 1;
        
        ToLog("Got NEW NetConstant (wait " + Delta + " s) Ver: " + Data.NetConstVer, 2);
        
        CopyNetConstant(JINN_NET_CONSTANT, Data);
        
        if(Engine.idTimerSetConst)
            clearTimeout(Engine.idTimerSetConst);
        Engine.idTimerSetConst = setTimeout(function ()
        {
            Engine.DoNetConst();
            Engine.idTimerSetConst = 0;
        }, Delta * 1000);
        
        return 1;
    };
    
    Engine.GetSignCheckNetConstant = function (Data)
    {
        var Buf = SerializeLib.GetBufferFromObject(Data, FormatForSign, {});
        return sha3(Buf, 12);
    };
    
    Engine.DoNetConst = function ()
    {
        ToLog("DoNetConstant: " + JINN_NET_CONSTANT.NetConstVer, 2);
        
        CopyNetConstant(JINN_CONST, JINN_NET_CONSTANT);
        var CountCreate = JINN_NET_CONSTANT.TEST_COUNT_BLOCK + JINN_NET_CONSTANT.NetConstStartNum - Engine.CurrentBlockNum;
        if(JINN_NET_CONSTANT.TEST_COUNT_BLOCK && CountCreate > 0)
        {
            ToLog("*************CountBlockCreate: " + CountCreate + " witch TX=" + JINN_CONST.TEST_COUNT_TX, 2);
            global.SendTestCoin(1, random(1000000), 1, JINN_CONST.TEST_COUNT_TX, CountCreate, 1);
        }
    };
}

function CopyNetConstant(Dst,Src,bNotSign)
{
    for(var key in FORMAT_NET_CONSTANT)
    {
        if(bNotSign && key === "NET_SIGN")
            continue;
        Dst[key] = Src[key];
    }
    
    return Dst;
}
