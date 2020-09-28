﻿# WellBeing Network (WBN) PLATFORM
 ### Публичная криптоплатформа нового типа для обеспечения функционала смарт-контрактов, создания децентрализованных приложений и автоматизации любых технологических процессов, потребных для осуществления своей деятельности как участникам сообщества так и самому проекту
 ## Спецификация

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

## Предназначение

+ Платформа создана для формирования защищенной цифровой среды обеспечивающей p2p коммуникации между участниками проекта и позволяющей осуществлять обмен ценностями без участия посредников.
+ Технические возможности платформы позволяют развертывать программные комплексы, работающие независимо от какого либо конкретного компьютера и выполняющие разнообразные задачи, которые возникают в процессе жизнедеятельности социума, использующего эту платформу для своих целей.
+ Мерилом ценности установлена уникальная электронная запись, полученная в результате хэширования данных, записываемая и сохраняемая в блокчейне платформы и, благодаря техническим решениям, созданным автором исходных кодов, остающаяся неизменной после завешения процесса передачи.
+ Эта ценность имеет признаки денег благодаря своей уникальности, делимости и простоте передачи между участниками хозяйственных, финансовых и иных материальных рассчетов, осуществляемых при помощи криптоплатформы WellBeing Network.
+ Монеты хранятся на счетах, по аналогии с банковскими счетами.
+ Номера счетов генерируются системой по порядку, нумеруясь от нуля и далее, по порядку.
+ Нулевой номер счета имеет системный аккаунт, на который первоначально эмитировано 1 млрд монет.
+ Для создания нового счета необходимо отправить в сеть специальную транзакцию при помощи интерфейса кошелька , в которой указывается публичный ключ владельца и необязательный параметр - "Публичное имя": осмысленное название создаваемого счёта (строка до 40 байт длины).
+ Название желательно для проверки правильности ввода номера счета при отправке платежа.
