/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Session"});

//Engine context

function InitClass(Engine)
{
    Engine.InitTransferSession = function (BlockNum)
    {
        var Arr = [];
        for(var i = 0; i < Engine.LevelArr.length; i++)
        {
            var Child = Engine.LevelArr[i];
            if(Child && Child.IsHotReady())
            {
                Child.TransferSessionNum = BlockNum;
                Arr.push(Child);
            }
        }
        
        Engine.TransferList.AddItemToCache({BlockNum:BlockNum, Arr:Arr});
    };
    
    Engine.TransferList = new CBlockCache(function (a,b)
    {
        return a.BlockNum - b.BlockNum;
    });
    
    Engine.GetTransferSession = function (BlockNum)
    {
        var Item = Engine.TransferList.FindItemInCache({BlockNum:BlockNum});
        if(Item)
            return Item.Arr;
        else
            return [];
    };
}
