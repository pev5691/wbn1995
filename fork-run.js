global.FORK_MODE = 1; //set to 1 for fork
global.NETWORK = "WBN-MAIN"; //max 10 chars
global.START_NETWORK_DATE = 1590866000000; //formula of it value is (new Date(2019, 8, 20, 17, 0, 0, 0))-0;
global.CONSENSUS_PERIOD_TIME = 2000; //ms
global.FORK_IP_LIST = [
  {"ip":"188.170.194.168","port":50005},
  {"ip":"194.67.221.153","port":50005},
  {"ip":"10.42.0.1","port":50005},
  {"ip":"127.0.0.1","port":50005},
  {"ip":"127.0.0.1","port":50006},
  {"ip":"127.0.0.1","port":50007}];
/*
global.FORK_MODE=1;
global.NETWORK="FORK-MAIN";//10
global.START_NETWORK_DATE=1590777800000+300*1000;  //(new Date(2018, 6, 1, 12, 0, 0, 0))-0;
global.CONSENSUS_PERIOD_TIME=1000;//ms
global.START_PORT_NUMBER=30002;
global.FORK_IP_LIST=[{"ip":"127.0.0.1","port":30000},{"ip":"127.0.0.1","port":30001}];
*/
