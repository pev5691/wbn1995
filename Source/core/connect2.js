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


module.exports = class CConnect2 extends require("./transfer-msg")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    }
    GetBitsByLevel()
    {
        var Maska = 0;
        for(var i = 0; i < this.LevelNodes.length; i++)
        {
            var arr = this.LevelNodes[i];
            if(arr && arr.length)
                Maska |= 1 << i
        }
        
        return Maska;
    }
    
    OnSetProtocolMode()
    {
        if(global.PROTOCOL_VER === 2)
        {
            global.MIN_CONNECT_CHILD = 1
            global.MAX_CONNECT_CHILD = 1
        }
        else
        {
            global.MIN_CONNECT_CHILD = 2
            global.MAX_CONNECT_CHILD = 7
        }
    }
    
    GetMaxConnectChilds()
    {
        var Count = global.MAX_CONNECT_CHILD;
        if(global.PROTOCOL_VER === 2)
        {
            if(this.NodesArr.length <= MIN_NODES_FOR_DOUBLE_MODE)
                Count++
        }
        
        return Count;
    }
};
