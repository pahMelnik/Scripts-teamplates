const ENV = {
    CORE: "core_export_import_v1.9.0", // Версия ядра
    LOGGING_TO_MULTICUBE: { // Логгирование в МК, Описание: https://rucom.optimacros.com/topic/1864/ядро-core_export_import/5

        SCRIPT_NAME: "***", // Имя элемента в измерении скриптов

        MULTICUBE: "***", // Название МК для логироваия

        MULTICUBE_VIEW: "***", // Вью для логирования

        SCRIPT_LIST: "Scripts", // Название измерения скриптов

        SCRIPT_LIST_VIEW: null, // Вью измерения скриптов
        
        LOCALE: 'en-Us', // Название локали как в javascript
        
        LOCALE_OPTIONS: { // Опции форматирования времени для метода toLocaleString() javascript 
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',

            timeZone: 'Asia/Tomsk',

            hour: '2-digit',
            minute: '2-digit',

        },
        CUBES: { // порядок кубов и их названия во вью МК логгирования
            Date: "Date", // время (по умолчанию часовой пояс МСК)
            Status: "Status", // OK, если скрипт завершился, и ERROR, если в ходе выполнения была ошибка
            Output: "Output", // содержимое модалки отчёта скрипта (уровень вывода по умолчанию INFO, настраивается опцией SHOUTER_LOGGER_LVL рядом с опцией SHOUTER_LVL)
            Stopwatch: "Stopwatch", // время работы скрипта
            User: "User" // пользователь, запустивший скрипт
        },
    },
    SHOUTER_LVL: "***", // TRACE/DEBUG/INFO/WARNING/ERROR (Больше информации -> Меньше информации)
    SHOW_ERROR_STACK: true, // Показывает не только текст ошибки, но и call-stack
    DISABLE_LOCK_SWITCHING: true, // Управлениие блокировкой скриптов, если на WS нету колонки Lock Mode нужно отключать
    SRC : {
        TYPE: "***", 
        /*
        FILES - Загрузка файлов из сетевых папок, FTP или примонтированная папка (Например SMB/CIFS)
        LOGINOM - Экспорт JSON данных из системы Loginom используя внешний HTTP сервис
        WEB_SERVICE - Экспорт данных из любого внешнего HTTP сервиса. Используя приемник RAW_JSON, позволяет посмотреть на JSON ответ от сервиса, не пытаясь его прогонять через ETL
        ODATA - Экспорт JSON-ODATA данных используя внешний HTTP сервис
        MSSQL - Экспорт данных из Microsoft SQL Server используя SELECT запрос
        LIST - Экспорт справочника из текущей модели Optimacros
        MULTICUBE - Экспорт мультикуба из текущей модели Optimacros
        OM_MULTICUBE - Быстрый экспорт мультикуба из текущей модели Optimacros
        POSTGRESQL - Экспорт данных из PostgreSQL используя SELECT запрос
        MYSQL - Экспорт данных из MySQL используя SELECT запрос
        ORACLE - Экспорт данных из Oracle используя SELECT запрос
        */
        PARAMS: {
            NAME: "***", // Названиие МК для выгрузки, если выбран источниик MULTICUBE/OM_MULTICUBE
            VIEW: "***", // Названиие предсавления, если выбран источниик MULTICUBE/OM_MULTICUBE
            FORMULA_FILTER: `***`, // Формула для опроеделения данных, которые отдаются на экспорт, форммула пишется в формате Оптмакрос. `TRUE`, если хотим отправиить все данные.
            ROW_HEADERS: { /*При экспорте справочника из ОМ (доступно для источников LIST и MULTICUBE) позволяет экспортиировать:
                             Display Name справочников (при указании значения параметра как LABEL);
                             Item Name справочников (при указании значения параметра как  NAME);
                             Code справочника (при указании значения параметра как  CODE);
                             Пусто (при указании значения параметра как  NONE).
                            */
                SCR_TYPE: "***",
            },
            QUERY: {
                TYPE:"RAW_QUERY", //
                PARAMS: {
                    PRE_QUERY: ``, // Позволяет передать на сервер дополнительные SQL запросы до начала основного запроса.
                    VALUE: ``, // Основной SQL запрос, необходимо учитывать особенности разных СУБД
                    BINDS: ["", ""] // Позволяет передавать значения в запрос, значения подставляются вместо `?` в VALUE
                }
            },
            CONNECTION: { // Параметры подключения
                HOST: "***", // ip адресс подключения к СУБД
                PORT: 0000, // Порт подключения к СУБД
                USER: "***", // Пользоватьель
                PASSWORD: "***", // Пароль
                DB: "***", // Название СУБД к которой мы подключаемся
                SID: "" // Параметр указываемый только для ORACLE, для остальных СУБД его быть не должно
            }
        }
    },
    DEST: {
        TYPE: "***",
        /*
        CSV - Приемник позволяет представить и скачать переданные данные из источника как CSV таблицу
        JSON - Приемник позволяет представить и скачать переданные данные из источника как JSON близкий к табличному представления (на сколько это возможно). Можно использовать с большинством источников
        RAW_JSON - Приемник позволяет скачать чистый JSON от источников, которые работают с web сервисами (LOGINOM, WEB_SERVICE, ODATA)
        MULTICUBE - Импорт данных из источника в Optimacros мультикуб через обычный импорт
        LIST - Импорт данных из источника в Optimacros справочник
        LISTS - Импорт данных из источника в Optimacros справочники, по очереди, нужен для импорта в иерархии справочников
        MSSQL - Импорт данных в Microsoft SQL Server используя INSERT запросы
        MSSQL_BCP - Быстрый импорт данных в Microsoft SQL Server используя утилиту BCP
        MSSQL_DIRECT_BCP - Быстрый импорт данных в Microsoft SQL Server используя утилиту BCP с доп. оптимизациями, что делает приемник более быстрым чем MSSQL_BCP, но менее гибким в настройках
        WEB_SERVICE - Импорт JSON данных в HTTP сервис используя POST запрос
        LOGINOM - Импорт JSON данных в HTTP сервис Loginom
        POSTGRESQL - Импорт данных в PostgreSQL используя INSERT запросы
        OM_MULTICUBE - Импорт данных из источника в Optimacros мультикуб через быстрый импорт
        MYSQL - Импорт данных в MySQL используя INSERT запросы
        Сейчас есть проблемы с производительностью этого приемника, используйте приемник MYSQL_IMPORT
        MYSQL_IMPORT - Импорт данных в MySQL используя CSV файл, который формируется на основе входящих данных от источника. Быстрый и универсальный, работает с всеми типами источников (2млн строк * 4 колонки используя источник OM_MULTICUBE выгружает за ~65 секунд). Позволяет гибко задать карту связей между колонками источника и таблицей приемником, но это снижает производительность и сильно уступает в нем кейсу OM_MULTICUBE -> MYSQL_IMPORT_RAW
        MYSQL_IMPORT_RAW - Импорт данных в MySQL используя CSV файл, работает только с источником OM_MULTICUBE. Самый быстрый вариант импорта данных OLAP -> OLTP, из OM выгружается CSV файл и без дополнительного ETL сразу передается в MySQL, быстрее этого подхода для обмена данными OLAP -> OLTP на данный момент ничего нет. 
        */
        PARAMS: {
            NAME: "KPF Import data from OLTP", // Название МК/Справочника для приемников LIST, MULTICUBE, OM_MULTICUBE
            TRANSFORM: { // Преобразование файлов для иммпорма в справочники и МК в ОМ
                DOWNLOAD_TRANSFORM_FILE: false, // true/false Условие скачивания преобразованного файла
                DOWNLOAD_IMPORT_REPORT_FILE: false, // true/false Условие скачивания отчета о загрузке данных
                CHARSET: "WINDOWS-1251", //UTF-8|WINDOWS-1251
                SRC_TO_DEST_COLUMN_MAP: {
				"DT":"DT",
                "KT":"KT"
               },
              DIMENSIONS: {
                    dim1: {
                    NAME: "Months",
                    SRC_COLUMN_NAME: "Period",
                    CAN_USE_IN_CLEANER: false,
                        CAN_USE_NAME_COMPARISON_IN_CLEANER: false,
                        ON_VALUE: "BASE_DATE"
                        }
               },
                CUSTOM_COLUMNS: [],
                SRC_COLUMN_PREPARE_DATA_MAP: {}
            },
            TABLE: "***", // Название таблицы для импорта в БД
            CONNECTION: { // Параметры подключения
                HOST: "***", // ip адресс подключения к СУБД
                PORT: 0000, // Порт подключения к СУБД
                USER: "***", // Пользоватьель
                PASSWORD: "***", // Пароль
                DB: "***", // Название СУБД к которой мы подключаемся
                SID: "" // Параметр указываемый только для ORACLE, для остальных СУБД его быть не должно
            },
            CLEANER: {
                STATUS: true,
                FORMAT_FORMULA_MAP: {
                    "No Data": null,
                    "Date": `DATE("")`,
                    "Entity": `""`,
                    "Time Entity": `""`,
                    "Version": `""`,
                    "Line Item Subset": `""`,
                    "Number": `0`,
                    "Boolean": `FALSE`,
                    "Text": `""`
                }
            }
        }
    }
};
om.common.resultInfo()
    .actionsInfo()
    .makeMacrosAction(ENV.CORE)
    .appendAfter()
    .environmentInfo()
    .set('ENV', ENV);