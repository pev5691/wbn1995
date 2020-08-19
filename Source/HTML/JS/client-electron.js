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

const ipcRenderer = require('electron').ipcRenderer;

function GetDataElectron(Method,ObjPost,Func)
{
    
    if(Func === undefined)
    {
        Func = ObjPost;
        ObjPost = null;
    }
    
    var reply;
    try
    {
        reply = ipcRenderer.sendSync('GetData', {path:Method, obj:ObjPost});
    }
    catch(e)
    {
        reply = undefined;
    }
    if(Func)
        Func(reply);
}



window.GetData = GetDataElectron;
