/*
 * @project: WellBeingNetwork
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * @copypaste: Evgeny Pustolenko (pev5691)  2019-2020 [pev5691@yandex.ru]
 * Facebook: https://www.facebook.com/pev5691
 * Telegram:  https://t.me/wellbeingnetwork
 * Github: https://github.com/pev5691/wbn1995
 * Discord: https://discord.gg/t9V9uj
 */

global.FORK_MODE = 1; //set to 1 for fork
global.NETWORK = "WBN-MAIN"; //max 10 chars
global.START_NETWORK_DATE = 1599710077777      // Сутки - 86400000 милисекунд
// global.START_NETWORK_DATE = 1599551515777   // Час - 3600000 милисек
// global.START_NETWORK_DATE = 1599559915777   // Минута - 60000 мс
global.CONSENSUS_PERIOD_TIME = 3000; //ms

global.FORK_IP_LIST = [
    {"ip":"194.147.78.188","port":34734},    // Vdska wbnwallet порт вебморды w1
    {"ip":"194.147.78.188","port":3747},     // Vdska wbn3      порт вебморды w2
    {"ip":"194.147.78.188","port":7347},     // Vdska wbn4      порт вебморды w3
    {"ip":"185.125.217.70","port":34734},    // totoihor wbn5   порт вебморды w4
    {"ip":"185.125.217.70","port":3747},     // totoihor wbn6   порт вебморды w5
    {"ip":"185.125.217.70","port":7347}      // totoihor wbn7   порт вебморды w6
];