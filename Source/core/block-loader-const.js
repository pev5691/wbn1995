/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/



global.PERIOD_GET_BLOCK = 300;
global.COUNT_HISTORY_BLOCKS_FOR_LOAD = 600;
global.COUNT_BLOCKS_FOR_CHECK_POW = 50;
global.MAX_DELTA_COUNT_SUM_FOR_LOAD = 10;

global.MAX_COUNT_CHAIN_LOAD = 120;

global.PACKET_ALIVE_PERIOD = 4 * CONSENSUS_PERIOD_TIME;
global.PACKET_ALIVE_PERIOD_NEXT_NODE = 2000;

global.MAX_BLOCK_SEND = 50;
global.COUNT_TASK_FOR_NODE = 10;

global.FORMAT_BLOCK_TRANSFER = "{\
    BlockNum:uint,\
    TreeHash:hash,\
    arrContent:[tr],\
    }";

global.WRK_BLOCK_TRANSFER = {};


global.MAX_ACCOUNTS_TRANSFER = 1024;
global.MAX_SMARTS_TRANSFER = 10;
if(global.TEST_NETWORK)
{
    global.MAX_ACCOUNTS_TRANSFER = 128;
    global.MAX_SMARTS_TRANSFER = 10;
}

global.FORMAT_REST_TRANSFER = "{\
        Result:uint,\
        Version:uint,\
        Arr:[arr200],\
        ProofHash:hash,\
        ProofArrL:<hash>,\
        ProofArrR:<hash>,\
    }";
global.FORMAT_SMART_TRANSFER = "{\
        Result:uint,\
        Arr:[tr],\
    }";
