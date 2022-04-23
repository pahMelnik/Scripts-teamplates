//core_ddtt_v4.2.0

const ENV = om.environment.get('ENV', null);

if (!ENV) {
    throw new Error('ENV not defined');
}

const connection = om.connectors.sqlServer()
    .setHost(ENV.CONNECTION.HOST)
    .setPort(ENV.CONNECTION.PORT || -1)
    .setUsername(ENV.CONNECTION.USER)
    .setPassword(om.connectors.http().base64Decode(ENV.CONNECTION.PASSWORD))
    .setDatabase(ENV.CONNECTION.DB)
    .load();

const MONTHS_MAP = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12
};

class BaseActionHandler {
    constructor(/**CellInfo*/cell, params) {
        this.cell = cell;
        this.params = params;
        /**
         * @type {CsvWriter}
         */
        this.writer = om.filesystems.filesDataManager().csvWriter();
        this.cubeIdentifier = null;
        this.year = 0;
        this.months = [];
        this.count = 0;
        this.pages = 0;
        this.where = [];
        this.identifiers = [];
    }

    writeHeaders() {
        om.common.requestInfo().log("Write csv headers", true);
        let headers = [];
        for (let header in this.params.COLUMN_NAMES_MAP) {
            headers.push(header);
        }
        this.writer.writeRow(headers);
    }

    /**
     * @param {number} page
     */
    writeDataPage(page) {
        let offsetRow = page * this.params.ROWS_LIMIT;
        let limitRow = this.params.ROWS_LIMIT;

        let columns = []
        for (let header in this.params.COLUMN_NAMES_MAP) {
            columns.push(this.params.COLUMN_NAMES_MAP[header]);
        }

        let orderStmt = "";
        if (this.params.ORDER_COLUMN) {
            orderStmt = `ORDER BY ${this.params.ORDER_COLUMN}`;
        }

        let sql = `
            SELECT ${columns.join(', ')}
            FROM ${this.params.TABLE_NAME}
            WHERE 1=1 ${this.where.join(' ')}
            ${orderStmt}
            OFFSET ${offsetRow} ROWS FETCH NEXT ${limitRow} ROWS ONLY
        `;

        om.common.requestInfo().logStatusMessage(`Search and write rows: [${offsetRow}/${this.count}]`, true);

        const generator = connection.qb().execute(sql).generator(true);

        let rows = [];
        for (let row of generator) {
            rows.push(row);
        }

        if (!rows.length) {
            return;
        }

        this.writer.writeRows(rows);
    }

    loadDateFilter() {
        if (this.params.DATE_COLUMN) {
            this.where.push(`AND YEAR(${this.params.DATE_COLUMN}) = ${this.year}`);
            this.where.push(`AND MONTH(${this.params.DATE_COLUMN}) IN (${this.months.join(", ")})`);
        }
        return this;
    }

    loadWhereFilter(whereFilter) {
        whereFilter.forEach(statement => {
            this.where.push(statement);
        });
        return this;
    }

    loadFilters() {
        this.loadDateFilter();

        if (this.params.PROPERTY_FILTER) {
            this.loadPropertyFilters(this.identifiers, this.params.PROPERTY_FILTER);
        }

        if (this.params.WHERE_FILTER) {
            this.loadWhereFilter(this.params.WHERE_FILTER);
        }

        return this;
    }

    loadCubeFromCellInfo() {
        this.identifiers.some(identifier => {
            const _typeId = Math.trunc(identifier / 1000000000);
            const longId = 100000000000 + _typeId;
            const entity = om.common.entitiesInfo().get(longId);
            if (entity.name() === "Cube" || entity.name() === "Line Item") {
                this.cubeIdentifier = identifier;
                return true;
            }
        });

        return true;
    }

    loadTimeFromCellInfo() {
        if (!this.identifiers.length) {
            return false;
        }

        let timeIdentifier = this.identifiers[0];

        if (!this.loadTimeEntity(timeIdentifier, this.cubeIdentifier)) {
            return false;
        }

        return true;
    }

    loadTimeEntity(timeIdentifier, cubeIdentifier) {
        let time = om.common.entitiesInfo().get(timeIdentifier);

        if (!time) {
            om.common.requestInfo().log("Selected cell has't time dimension", true);
            return false;
        }

        let type = 'default';
        let month = null;
        let shortYear = null;

        let result;
        while (result = /^FY([0-9]+)/g.exec(time.name())) {
            shortYear = result[1];
            type = 'FY';
            break;
        }

        if (shortYear === null) {
            let monthName;
            [monthName, shortYear] = time.name().split(' ');
            if (!MONTHS_MAP.hasOwnProperty(monthName)) {
                om.common.requestInfo().log("Selected cell month not valid", true);
                return false;
            }
            month = MONTHS_MAP[monthName];
        }

        if (!shortYear) {
            om.common.requestInfo().log("Short year not found", true);
            return false;
        }

        this.year = 2000 + parseInt(shortYear);

        if (cubeIdentifier) {
            let cube = om.common.entitiesInfo().get(cubeIdentifier);
            if (!cube) {
                om.common.requestInfo().log("Selected cell cube not valid", true);
                return false;
            }
            type = cube.code() !== null ? cube.code().split('_').pop() : null;
        }

        switch (type) {
            case "YTD":
                if (month === null) {
                    om.common.requestInfo().log("Selected cell month not valid", true);
                    return false;
                }
                for (let i = 1; i <= month; i++) {
                    this.months.push(i);
                }
                break;
            case "YTG":
                if (month === null) {
                    om.common.requestInfo().log("Selected cell month not valid", true);
                    return false;
                }
                if (month == 12) {
                    om.common.requestInfo().log(`Choosed month not valid for YTG drill down`, true);
                    return false;
                }
                for (let i = month + 1; i <= 12; i++) {
                    this.months.push(i);
                }
                break;
            case "FY":
                for (let i = 1; i <= 12; i++) {
                    this.months.push(i);
                }
                break;
            case "LY":
                if (month === null) {
                    om.common.requestInfo().log("Selected cell month not valid", true);
                    return false;
                }
                this.months.push(month);
                this.year--;
                break;
            default:
                if (month === null) {
                    om.common.requestInfo().log("Selected cell month not valid", true);
                    return false;
                }
                this.months.push(month);
                break;
        }

        om.common.requestInfo().log(`Month: ${this.months.join(', ')}\nYear: ${this.year}`, true);

        return true;
    }

    collectCountInfo() {
        let sqlCount = `
            SELECT COUNT(*) as srcRowsCount
            FROM ${this.params.TABLE_NAME}
            WHERE 1=1 ${this.where.join(' ')}
        `;

        let sqlCountRow = connection.qb().execute(sqlCount).first();
        // noinspection JSUnresolvedVariable
        this.count = sqlCountRow.srcRowsCount;
        this.pages = Math.ceil(this.count / this.params.ROWS_LIMIT);

        if (this.count == 0) {
            om.common.requestInfo().logStatusMessage("Query result is empty", true);
        } else {
            om.common.requestInfo().log(`Found ${this.count} rows to export`, true);
        }
    }

    writeData() {
        this.loadFilters();
        this.collectCountInfo();

        if (!this.count) {
            return;
        }

        this.writeHeaders();

        for (let page = 0; page < this.pages; page++) {
            this.writeDataPage(page);
        }

        om.common.requestInfo().logStatusMessage(`Search and write rows: [${this.count}/${this.count}]`, true);
    }

    /**
     * @type {string}
     */
    getFileName() {
        throw new Error("Method 'getFileName' is abstract");
    }

    loadCellInfo() {
        this.identifiers = this.getCellIdentifiers();

        if (!this.loadCubeFromCellInfo()) {
            return false;
        }

        if (!this.loadTimeFromCellInfo()) {
            return false;
        }

        return true;
    }

    save() {
        if (!this.count) {
            return;
        }
        om.common.requestInfo().log("Save file", true);
        let path = this.writer.save("file", "WINDOWS-1251");
        let hash = om.filesystems.local().makeGlobalFile(this.getFileName(), 'csv', path, true);
        om.common.resultInfo().addFileHash(hash);
    }

    /**
     *
     * @returns {string}
     */
    monthFileNamePart() {
        let months = [...this.months];
        return months.shift() + (months.length ? "-" + months.pop() : "");
    }

    /**
     *
     * @returns {number[]}
     */
    getCellIdentifiers() {
        let entityLongIds = [...this.cell.entityLongIds];

        entityLongIds.sort((a, b) => a - b);

        return entityLongIds;
    }

    /**
     *
     * @param identifiers
     * @param types
     * @returns {*}
     */
    getIdentifierByTypes(identifiers, types) {
        let _identifier = null;
        identifiers.forEach(identifier => {
            const _typeId = Math.trunc(identifier / 1000000000);
            let some = types.some(typeId => {
                if (_typeId == typeId) {
                    _identifier = identifier;
                    return true;
                }
            });
            if (some) {
                return;
            }
        });
        if (_identifier === null) {
            throw new Error(`Type not found in identifiers [${identifiers.join(', ')}] and types [${types.join(', ')}]`);
        }
        return _identifier;
    }

    /**
     *
     * @param code
     * @param propertyName
     * @param delimiter
     * @returns {[]|Array}
     */
    retrieveValueFromProperty(code, propertyName, delimiter) {
        if (code === null || code === "") {
            return null;
        }
        let codes = [];
        if (delimiter) {
            code.split(delimiter).forEach(val => {
                codes.push(val);
            });
        } else {
            codes.push(code);
        }
        return codes;
    }

    /**
     *
     * @param listName
     * @param propertyName
     * @param delimiter
     * @param contextIdentifier
     * @returns {[]}
     */
    loadListItemProperties(listInfo, propertyName, delimiter, contextIdentifier) {
        const entity = om.common.entitiesInfo().get(contextIdentifier);
        if (!entity) {
            throw new Error(`Entity '${contextIdentifier}' not found`);
        }
        om.common.requestInfo().logStatusMessage(`Load list ${listInfo.NAME}`, true);
        const pivot = om.lists.listsTab().open(listInfo.NAME).pivot(listInfo.VIEW);
        const grid = pivot.addDependentContext(entity.longId())
            .columnsFilter(["List", propertyName])
            .create();
        if (!grid.rowCount()) {
            throw new Error(`Item with name '${entity.name()}' not found in list '${listInfo.NAME}'`);
        }
        const generator = grid.range(0, -1, 0, -1).generator(5000);
        const rowValues = [];
        for (let chunk of generator) {
            chunk.rows().all().forEach(rowLabels => {
                const columns = {};
                rowLabels.cells().all().forEach(cell => {
                    columns[cell.columns().first().name()] = cell;
                });
                if (!columns.hasOwnProperty("List")) {
                    throw new Error(`Property 'List' not found in list '${listInfo.NAME}' for item '${entity.name()}'`);
                }
                if (columns["List"].getValue() !== listInfo.NAME) {
                    return;
                }
                if (!columns.hasOwnProperty(propertyName)) {
                    throw new Error(`Property '${propertyName}' not found in list '${listInfo.NAME}' for item '${entity.name()}'`);
                }
                const propertyValues = this.retrieveValueFromProperty(columns[propertyName].getValue(), propertyName, delimiter);
                if (propertyValues !== null) {
                    rowValues.push(propertyValues);
                }
            });
        }
        if (!rowValues.length) {
            throw new Error(`Property values not found in list '${listInfo.NAME}' for item '${entity.name()}'`);
        }
        return rowValues;
    }

    /**
     *
     * @param identifiers
     * @param propertyFilters
     * @returns {BaseActionHandler}
     */
    loadPropertyFilters(identifiers, propertyFilters) {
        propertyFilters.forEach(propertyFilter => {
            this.loadPropertyFilter(
                propertyFilter,
                identifiers
            );
        });

        return this;
    }

    /**
     *
     * @param listName
     * @param codeFilter
     * @param identifier
     */
    loadPropertyFilter(propertyFilter, identifiers) {
        const identifier = this.getIdentifierByTypes(identifiers, propertyFilter.TYPES);
        om.common.requestInfo().log(`Load property filter for list ${propertyFilter.LIST.NAME}`, true);
        const rowValues = this.loadListItemProperties(
            propertyFilter.LIST,
            propertyFilter.PROPERTY_NAME,
            propertyFilter.DELIMITER,
            identifier
        );
        let orWhere = [];
        let report = [];
        rowValues.forEach(rowValue => {
            let andWhere = [];
            rowValue.forEach((propertyValue, _index) => {
                if (propertyFilter.FILTER_COLUMNS.length <= _index) {
                    throw new Error(`Source column with index ${_index} not found for property values '${rowValue.join()}'`);
                }
                let columnName = propertyFilter.FILTER_COLUMNS[_index];
                andWhere.push(`${columnName} = '${propertyValue}'`);
                if (report.length <= _index) {
                    report.push(new Set());
                }
                report[_index].add(propertyValue);
            });
            orWhere.push(`(${andWhere.join(' AND ')})`);
        });
        this.where.push(`AND (${orWhere.join(' OR ')})`);
        report.forEach((rowValue, _index) => {
            om.common.requestInfo().log(`${propertyFilter.FILTER_COLUMNS[_index]}: ${(new Array(...rowValue)).join(',')}`, true);
        });
    }

    run() {
        if (!this.loadCellInfo()) {
            return;
        }
        this.writeData();
        this.save();
    }
}

class BaseOpexActionHandler extends BaseActionHandler {
    loadOpexFilter() {
        if (!this.params.CTB_FILTER) {
            return;
        }
        const cbtFilterConf = this.params.CTB_FILTER;
        let tab = om.lists.listsTab().open(cbtFilterConf.LIST.NAME);
        let pivot = tab.pivot(cbtFilterConf.LIST.VIEW).create();
        let generator = pivot.range(0, -1, 0, -1).generator(5000);
        let ctbCodes = [];
        for (let chunk of generator) {
            chunk.rows().all().forEach(rowLabels => {
                let properties = {};
                rowLabels.cells().all().forEach(cell => {
                    properties[cell.columns().first().name()] = cell;
                });
                if (!properties.hasOwnProperty(cbtFilterConf.VALUE_PROPERTY)) {
                    throw new Error(`CTB filter view property '${cbtFilterConf.VALUE_PROPERTY}' not found`);
                }
                if (properties[cbtFilterConf.VALUE_PROPERTY].getValue() == 'true') {
                    const code = rowLabels.first().code();
                    if (code !== "") {
                        ctbCodes.push(rowLabels.first().code());
                    }
                }
            });
        }
        om.common.requestInfo().log(`CTB filter list: ${cbtFilterConf.LIST.NAME}`, true);
        if (cbtFilterConf.LIST.VIEW !== null) {
            om.common.requestInfo().log(`CTB filter list view: ${cbtFilterConf.LIST.VIEW}`, true);
        }
        om.common.requestInfo().log(`CTB filter list property: ${cbtFilterConf.VALUE_PROPERTY}`, true);
        om.common.requestInfo().log(`CTB filter source column: ${cbtFilterConf.SRC_COLUMN}`, true);
        if (!ctbCodes.length) {
            throw new Error('CTB filter codes not found');
        }
        om.common.requestInfo().log(`CTB filter values: ${ctbCodes.join(',')}`, true);
        this.where.push(`AND ${cbtFilterConf.SRC_COLUMN} IN ('${ctbCodes.join("', '")}')`);
    }

    loadFilters() {
        super.loadFilters();
        this.loadOpexFilter();
    }
}

class OPEX_CC_KOC_REPORT_ActionHandler extends BaseOpexActionHandler {
    getFileName() {
        return `IFRS_Total_OPEX_KOC_CC_Drill_Down_${this.monthFileNamePart()}_${this.year}`;
    }
}

class OPEX_BH_CC_REPORT_ActionHandler extends BaseOpexActionHandler {
    getFileName() {
        return `IFRS_OPEX_BH_CC_Drill_Down_${this.monthFileNamePart()}_${this.year}`;
    }
}

class OPEX_BH_KOC_CC_REPORT_ActionHandler extends BaseOpexActionHandler {
    getFileName() {
        return `IFRS_OPEX_BH_CC_Drill_Down_${this.monthFileNamePart()}_${this.year}`;
    }
}

class CALCULATES_BY_BRANDS_ActionHandler extends BaseOpexActionHandler {
    getFileName() {
        return `IFRS_PL_KOC_PROD_Drill_Down_${this.monthFileNamePart()}_${this.year}`;
    }
}

class DEFAULT_ActionHandler extends BaseActionHandler {
    getFileName() {
        return `Drill_Down_${this.monthFileNamePart()}_${this.year}`;
    }
}

const actionHandlerMap = {
    OPEX_CC_KOC_REPORT: OPEX_CC_KOC_REPORT_ActionHandler,
    OPEX_BH_CC_REPORT: OPEX_BH_CC_REPORT_ActionHandler,
    OPEX_BH_KOC_CC_REPORT: OPEX_BH_KOC_CC_REPORT_ActionHandler,
    CALCULATES_BY_BRANDS: CALCULATES_BY_BRANDS_ActionHandler,
    DEFAULT: DEFAULT_ActionHandler,
}

const cellInfoModule = require("/common/cellInfo");

class Macros {

    constructor() {
        /**
         * @type {CellInfo}
         */
        this.cell = null;
        this.context = "";
    }

    loadCellInfo() {
        om.common.requestInfo().log("Load cell info", true);

        let cellInfoManager = cellInfoModule.loadFromEnvironment();

        this.cell = cellInfoManager.getFirstCell();

        if (!this.cell) {
            om.common.requestInfo().log("Please select cell", true);
            return false;
        }

        let [contextIdentifier] = this.cell.entityLongIds;

        let context = om.common.entitiesInfo().get(contextIdentifier);

        if (!context) {
            om.common.requestInfo().log("Context not found", true);
            return false;
        }

        this.context = context.name();

        return true;
    }


    runAction() {
        if (!ENV.ACTIONS.hasOwnProperty(this.context)) {
            om.common.requestInfo().log(`Query configuration with name '${this.context}' not found`, true);
            return false;
        }

        const actionType = ENV.ACTIONS[this.context].TYPE;

        if (!actionHandlerMap.hasOwnProperty(actionType)) {
            om.common.requestInfo().log(`Context handler '${actionType}' not found`, true);
            return false;
        }

        /**
         * @type BaseActionHandler
         */
        let obj = new actionHandlerMap[actionType](this.cell, ENV.ACTIONS[this.context].PARAMS);

        obj.run();

        return true;
    }

    /**
     * @returns {Macros}
     */
    load() {
        if (!this.loadCellInfo()) {
            return this;
        }
        if (!this.runAction()) {
            return this;
        }
        om.common.requestInfo().log("Done", true);
        return this;
    }
}

(new Macros()).load();