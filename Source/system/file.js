/*
 * @project: WellBeingNetwork
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * @copypaste: Evgeny Pustolenko (pev5691)  2019-2020 [pev5691@yandex.ru]
 * Web: https://www.facebook.com/pev5691
 * Telegram:  https://t.me/wellbeingnetwork
 */


"use strict";

global.TYPE_TRANSACTION_FILE = 5;

global.FORMAT_FILE_CREATE = "{Type:byte,Name:str,ContentType:str,Reserve:arr10,Data:tr}";
const WorkStructRun = {};


class FileApp extends require("./dapp")
{
    constructor()
    {
        super()
    }
    
    OnWriteTransaction(Block, Body, BlockNum, TrNum, ContextFrom)
    {
        return true;
    }
    
    GetFormatTransaction(Type)
    {
        return FORMAT_FILE_CREATE;
    }
    
    GetVerifyTransaction(Block, BlockNum, TrNum, Body)
    {
        return 1;
    }
}
module.exports = FileApp;
var App = new FileApp;
DApps["File"] = App;
DAppByType[TYPE_TRANSACTION_FILE] = App;
