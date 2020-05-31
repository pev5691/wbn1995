/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Control the number of transactions
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"TxControl"});

//Engine context

function InitClass(Engine)
{
    
    Engine.GetArrayFromTree = function (Tree)
    {
        if(!Tree)
            return [];
        var arr = [];
        var it = Tree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            arr.push(Item);
        }
        return arr;
    };
    
    Engine.GetTopTxArrayFromTree = function (Tree)
    {
        if(!Tree)
            return [];
        
        var BufLength = 0;
        var arr = [];
        var it = Tree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            arr.push(Item);
            if(Item.body)
            {
                BufLength += Item.body.length;
                if(BufLength > JINN_CONST.MAX_BLOCK_SIZE)
                    break;
            }
        }
        return arr;
    };
    
    Engine.AddTxToTree = function (Tree,Tx)
    {
        var Tx0 = Tree.find(Tx);
        if(Tx0)
        {
            JINN_STAT.WasSendOnAddTxToTree++;
            return 3;
        }
        else
        {
            Tree.insert(Tx);
            if(Tree.size > JINN_CONST.MAX_TRANSACTION_COUNT)
            {
                var maxitem = Tree.max();
                Tree.remove(maxitem);
                
                if(CompareArr(maxitem.HashPow, Tx.HashPow) === 0)
                {
                    JINN_STAT.NotAddTxToTree++;
                    return 0;
                }
            }
            
            JINN_STAT.AddToTreeTx++;
            return 1;
        }
    };
    
    Engine.CheckSizeTXArray = function (Child,TxArr)
    {
        if(TxArr.length > JINN_CONST.MAX_TRANSACTION_COUNT)
        {
            Child.ToError("Error Tx Arr length = " + TxArr.length, 4);
            TxArr.length = JINN_CONST.MAX_TRANSACTION_COUNT;
        }
    };
    Engine.IsValidateTx = function (Tx,StrCheckName,BlockNum)
    {
        var Result = CheckTx(StrCheckName, Tx, BlockNum, 1);
        if(!Result)
            JINN_STAT.NoValidateTx++;
        return Result;
    };
}

function FSortTx(a,b)
{
    if(typeof a.TimePow !== "number")
        throw "Error typeof a.TimePow";
    if(typeof b.TimePow !== "number")
        throw "Error typeof b.TimePow";
    if(!a.HashPow)
        throw "Error a.HashPow";
    if(!b.HashPow)
        throw "Error b.HashPow";
    
    if(a.TimePow !== b.TimePow)
        return b.TimePow - a.TimePow;
    return CompareArr(a.HashPow, b.HashPow);
}
global.FSortTx = FSortTx;
