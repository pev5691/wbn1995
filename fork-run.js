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
global.START_NETWORK_DATE = 1598463131275; //formula of it value is (new Date(2019, 8, 20, 17, 0, 0, 0))-0;
global.CONSENSUS_PERIOD_TIME = 3000; //ms

global.FORK_IP_LIST = [
    {"ip":"127.0.0.1","port":50005},        // localhost wbn1
    {"ip":"127.0.0.1","port":50006},        // localhost wbn2
    {"ip":"127.0.0.1","port":50007},        // localhost wbn3
    {"ip":"194.67.221.153","port":50005},   // ihor totoha
    {"ip":"194.67.221.153","port":50006},   // ihor totoha
    {"ip":"194.67.221.153","port":50007},   // ihor totoha
    {"ip":"194.147.78.188","port":50005},   // Vdska 194.147.78.188
    {"ip":"194.147.78.188","port":50006},   // Vdska 194.147.78.188
    {"ip":"194.147.78.188","port":50007}  // Vdska 194.147.78.188
];

/*
global.FORK_MODE=1;
global.NETWORK="FORK-MAIN";//10
global.START_NETWORK_DATE=1590777800000+300*1000;  //(new Date(2018, 6, 1, 12, 0, 0, 0))-0;
global.CONSENSUS_PERIOD_TIME=1000;//ms
global.START_PORT_NUMBER=30002;
global.FORK_IP_LIST=[{"ip":"127.0.0.1","port":30000},{"ip":"127.0.0.1","port":30001}];
*/
//    {"ip":"185.26.121.248","port":50005},   // hostland
//    {"ip":"188.227.85.27","port":50005},    // Server Space
