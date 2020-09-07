/*
 * @project: WellBeingNetwork
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * @copypaste: Evgeny Pustolenko (pev5691)  2019-2020 [pev5691@yandex.ru]
 * Web: https://www.facebook.com/pev5691
 * Telegram:  https://t.me/wellbeingnetwork
 */

global.FORK_MODE = 1; //set to 1 for fork
global.NETWORK = "WBN-MAIN"; //max 10 chars
global.START_NETWORK_DATE = 1599177700000
global.CONSENSUS_PERIOD_TIME = 3000; //ms

global.FORK_IP_LIST = [
//    {"ip":"127.0.0.1","port":34734},        // localhost wbn1
//    {"ip":"127.0.0.1","port":50501},        // localhost wbn2
//    {"ip":"127.0.0.1","port":50502},        // localhost wbn3
    {"ip":"194.67.221.153","port":34347},   // ihor totoha
    {"ip":"194.67.221.153","port":3774},   // ihor totoha
//    {"ip":"194.67.221.153","port":50502},   // ihor totoha
    {"ip":"194.147.78.188","port":34347}   // Vdska 194.147.78.188
    {"ip":"194.147.78.188","port":3774},   // Vdska 194.147.78.188
//    {"ip":"194.147.78.188","port":50502}    // Vdska 194.147.78.188
];

/*
34347   //  admin port   HTTP_PORT_NUMBER
34374   //  node port    NET_WORK_MODE
34734   //  wallet port  HTTP_HOSTING_PORT
37434   //  jinn port    JINN_PORT
*/