﻿# ![Публичная криптоплатформа нового поколения](https://github.com/pev5691/smartcontract/blob/master/marktplace/welcombonus/img/wbnwelcome.svg) - WellBeing Network cryptoplatform
 
 ### Публичная криптоплатформа нового поколения для обеспечения функционала смарт-контрактов, создания децентрализованных приложений и автоматизации любых технологических процессов, потребных для осуществления своей деятельности как участникам сообщества так и самому проекту
 
 ## Спецификация
 
 <details>
 <summary>Параметры блокчейна и криптосети
</summary>
 
____

* Название: WBN
* Консенсус: PoW
* Алгоритм:  Terahash (sha3 + оптимизация на использование памяти)
* Максимальная эмиссия: 1 млрд (WBN)
* Вознаграждение за блок: одна миллиардная часть остатка нераспределенной суммы монет счета 0 умножается на 9
* Фонды разработки и продвижения: до 10% от добытого майнерами
* Время генерации блока: 3 секунды
* Время подтверждения блока: 8 секунд
* Размер блока: 350 Кбайт
* Скорость: 1000 транзакций в секунду
* Комиссия в транзакциях: бесплатно
* Криптография: sha3, secp256k1
* Платформа: Node.JS
* Язык смарт-контрактов: Javascript
____

</details>

## Предназначение

 <details>
 <summary>Предназначение платформы WBN и базовые принципы монетарной политики БЧ</summary>
 
____
 
+ Платформа создана для формирования защищенной цифровой среды обеспечивающей p2p коммуникации между участниками проекта и позволяющей осуществлять обмен ценностями без участия посредников.
+ Технические возможности платформы позволяют развертывать программные комплексы, работающие независимо от какого либо конкретного компьютера и выполняющие разнообразные задачи, которые возникают в процессе жизнедеятельности социума, использующего эту платформу для своих целей.
+ Мерилом ценности установлена уникальная электронная запись, полученная в результате хэширования данных, записываемая и сохраняемая в блокчейне платформы и, благодаря техническим решениям, созданным автором исходных кодов, остающаяся неизменной после завешения процесса передачи.
+ Эта ценность имеет признаки денег благодаря своей уникальности, делимости и простоте передачи между участниками хозяйственных, финансовых и иных материальных рассчетов, осуществляемых при помощи криптоплатформы WellBeing Network.
+ Монеты хранятся на счетах, по аналогии с банковскими счетами.
+ Номера счетов генерируются системой, нумеруясь от нуля и далее, по порядку, исходя из простого принципа пересчета регистраций.
+ Нулевой номер счета имеет системный аккаунт, на который первоначально эмитировано 1 млрд монет.
+ Для создания нового счета необходимо отправить в сеть специальную транзакцию при помощи интерфейса кошелька , в которой указывается публичный ключ владельца и необязательный параметр - "Публичное имя": осмысленное название создаваемого счёта (строка до 40 байт длины).
+ Название желательно для проверки правильности ввода номера счета при отправке платежа.
____
</details>

## Установка

 <details>
 <summary>Установка на UBUNTU 18.4:</summary>
 
____
```
apt-get install -y git
apt-get install -y nodejs
apt-get install -y npm
npm install pm2 -g
git clone https://gitlab.com/terafoundation/tera2.git wallet
apt install build-essential
apt group install "Development Tools"
cd wallet/Source
npm install
node set httpport:8080 password:<secret word (no spaces)>
pm2 start run-node.js
```

### open ports:

```
sudo ufw allow 30000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 80/tcp
```
</details>

____

## Запланировано
 <details>
 <summary>Идеи и концепции, которые предстоит реализовать</summary>
 
____
 
 1. Сертифицировать все соединения, подготовить возможность использования vpn и proxy через и для работы криптосети.
 2. Генерация монет. ВИП-кошельки. Зависимость количества монет в блоке от активности участников сети и полных рабочих нод.
 3. Реферальная программа для майнеров.
 4. Реферальная программа для пользователей депозитных контрактов.
 5. Фиат. Варианты вывода традиционные и возможные варианты обналичивания мелких (до 15 тысяч бибариков, эквивалент 6 советских рублей)
 6. Учет времени, проводимого в приложениях проекта и его монетизация для тех, кто относится к активу проекта. Структура предполагаемой команды.
</details>
