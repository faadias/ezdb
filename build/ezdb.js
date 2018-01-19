/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class EZDBException extends DOMException {
    constructor(message) {
        super(message, "EZDBException");
    }
}
exports.default = EZDBException;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var EZDBUpdateType;
(function (EZDBUpdateType) {
    EZDBUpdateType["REPLACE_EXISTING"] = "replace";
    EZDBUpdateType["UPDATE_EXISTING"] = "update";
    EZDBUpdateType["REPLACE_INSERT"] = "replace_insert";
    EZDBUpdateType["UPDATE_INSERT"] = "update_insert";
})(EZDBUpdateType = exports.EZDBUpdateType || (exports.EZDBUpdateType = {}));
var EZDBTransactionType;
(function (EZDBTransactionType) {
    EZDBTransactionType["READONLY"] = "readonly";
    EZDBTransactionType["READWRITE"] = "readwrite";
    EZDBTransactionType["VERSIONCHANGE"] = "versionchange";
})(EZDBTransactionType = exports.EZDBTransactionType || (exports.EZDBTransactionType = {}));
var EZDBQueryReturn;
(function (EZDBQueryReturn) {
    EZDBQueryReturn["VALUES"] = "values";
    EZDBQueryReturn["KEYS"] = "keys";
    EZDBQueryReturn["KEYVALUES"] = "keyvalues";
    EZDBQueryReturn["INDEXVALUES"] = "indexvalues";
    EZDBQueryReturn["KEYINDEXVALUES"] = "keyindexvalues";
})(EZDBQueryReturn = exports.EZDBQueryReturn || (exports.EZDBQueryReturn = {}));


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ezdbexception_1 = __webpack_require__(0);
const database_1 = __webpack_require__(6);
const enums_1 = __webpack_require__(1);
class DBManager {
    constructor() {
        this.dbs = new Map();
        this.defaultUpdateType = enums_1.EZDBUpdateType.UPDATE_EXISTING;
    }
    static get Instance() {
        return DBManager.instance = DBManager.instance || new DBManager();
    }
    has(dbName) {
        return this.dbs.has(dbName);
    }
    get(dbName) {
        return this.dbs.get(dbName);
    }
    get Loaded() {
        return true;
    }
    get DefaultUpdateType() {
        return this.defaultUpdateType;
    }
    set DefaultUpdateType(value) {
        this.defaultUpdateType = value;
    }
    isClosed(dbName) {
        let database = this.get(dbName);
        if (database) {
            return database.Closed;
        }
        throw new ezdbexception_1.default(`Database ${dbName} could not be found!`);
    }
    open(dbName, dbVersion, config) {
        const manager = this;
        const promise = new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);
            request.onupgradeneeded = () => {
                if (!config)
                    return;
                const idbDatabase = request.result;
                const storeSchemas = config.stores;
                for (let storeName in storeSchemas) {
                    const storeConfig = storeSchemas[storeName];
                    let idbStore;
                    let storeExistsInDB = idbDatabase.objectStoreNames.contains(storeName);
                    if (storeExistsInDB) {
                        if (storeConfig && storeConfig.drop) {
                            try {
                                idbDatabase.deleteObjectStore(storeName);
                                continue;
                            }
                            catch (error) {
                                reject(new ezdbexception_1.default(`${error} Store: ${storeName}`));
                                break;
                            }
                        }
                        idbStore = request.transaction.objectStore(storeName);
                    }
                    else {
                        try {
                            idbStore = idbDatabase.createObjectStore(storeName, storeConfig && storeConfig.key ? storeConfig.key : undefined);
                        }
                        catch (error) {
                            reject(new ezdbexception_1.default(`${error} Store: ${storeName}`));
                            break;
                        }
                    }
                    if (storeConfig) {
                        if (storeConfig.indexes) {
                            storeConfig.indexes
                                .filter(index => !idbStore.indexNames.contains(index.name))
                                .forEach(index => {
                                idbStore.createIndex(index.name, index.columns, { unique: index.unique });
                            });
                        }
                        if (storeConfig.dropindexes) {
                            storeConfig.dropindexes
                                .filter(indexName => idbStore.indexNames.contains(indexName))
                                .forEach(indexName => {
                                idbStore.deleteIndex(indexName);
                            });
                        }
                    }
                }
            };
            request.onsuccess = () => {
                const idbDatabase = request.result;
                const database = new database_1.default(idbDatabase);
                manager.dbs.set(dbName, database);
                return resolve(database);
            };
            request.onerror = () => {
                return reject(request.error);
            };
            request.onblocked = () => {
                return reject(new ezdbexception_1.default(`Database ${dbName} is blocked by another connection. Check if it's being used by other browser tabs.`));
            };
        });
        return promise;
    }
    drop(dbName) {
        const manager = this;
        const database = manager.dbs.get(dbName);
        const promise = new Promise((resolve, reject) => {
            if (!database) {
                reject(new ezdbexception_1.default(`No database named ${dbName} is currently loaded in EZDB! Can't drop it...`));
                return;
            }
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => {
                manager.dbs.delete(dbName);
                resolve(true);
            };
            request.onerror = () => {
                reject(request.error);
            };
            request.onblocked = () => {
                reject(new ezdbexception_1.default(`Can't drop database ${dbName} because it's not closed (and might be in use by other browser tabs).`));
            };
        });
        return promise;
    }
}
exports.default = DBManager;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class Query {
    constructor(store) {
        this.store = store;
        this.distinctFlag = false;
        this.ascFlag = true;
        this.limitValue = 0;
        this.bounds = {};
    }
    get Store() {
        return this.store;
    }
    get Limit() {
        return this.limitValue;
    }
    asc() {
        this.ascFlag = true;
        return this;
    }
    desc() {
        this.ascFlag = false;
        return this;
    }
    distinct() {
        this.distinctFlag = true;
        return this;
    }
    limit(limit) {
        this.limitValue = Math.max(Math.trunc(limit), 0);
        return this;
    }
    index(indexName) {
        this.indexName = indexName;
        return this;
    }
    upperBound(value, open = false) {
        if (!this.bounds.equal)
            this.bounds.upper = { value, open };
        return this;
    }
    lowerBound(value, open = false) {
        if (!this.bounds.equal)
            this.bounds.lower = { value, open };
        return this;
    }
    equals(value) {
        this.bounds.equal = { value };
        delete this.bounds.lower;
        delete this.bounds.upper;
        return this;
    }
    buildRange() {
        let range = undefined;
        if (this.bounds.equal) {
            range = IDBKeyRange.only(this.bounds.equal.value);
        }
        else {
            if (this.bounds.upper && this.bounds.lower) {
                range = IDBKeyRange.bound(this.bounds.lower.value, this.bounds.upper.value, this.bounds.lower.open, this.bounds.upper.open);
            }
            else if (this.bounds.upper) {
                range = IDBKeyRange.upperBound(this.bounds.upper.value, this.bounds.upper.open);
            }
            else if (this.bounds.lower) {
                range = IDBKeyRange.lowerBound(this.bounds.lower.value, this.bounds.lower.open);
            }
        }
        return range;
    }
    buildRequest(idbTransaction, isKeyCursor, isCount) {
        const idbStore = idbTransaction.objectStore(this.store.Name);
        let range = this.buildRange();
        let cursorType = this.ascFlag ? "next" : "prev";
        if (this.distinctFlag)
            cursorType += "unique";
        let querySource = this.indexName ? idbStore.index(this.indexName) : idbStore;
        let request;
        if (isCount) {
            request = querySource.count(range);
        }
        else if (isKeyCursor) {
            request = querySource.openKeyCursor(range, cursorType);
        }
        else {
            request = querySource.openCursor(range, cursorType);
        }
        return request;
    }
    exec() {
        return this.go();
    }
}
exports.default = Query;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = __webpack_require__(1);
const selectquery_1 = __webpack_require__(8);
const ezdbexception_1 = __webpack_require__(0);
class Store {
    constructor(name, database, autoIncrement) {
        this.name = name;
        this.database = database;
        this.autoIncrement = autoIncrement;
    }
    get Name() {
        return this.name;
    }
    get Database() {
        return this.database;
    }
    get AutoIncrement() {
        return this.autoIncrement;
    }
    get IdbTranWrite() {
        const idbTransaction = this.database.IdbDatabase.transaction(this.name, enums_1.EZDBTransactionType.READWRITE);
        return idbTransaction;
    }
    get IdbTranRead() {
        const idbTransaction = this.database.IdbDatabase.transaction(this.name, enums_1.EZDBTransactionType.READONLY);
        return idbTransaction;
    }
    truncate() {
        const promise = new Promise((resolve, reject) => {
            if (this.Database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.Database.Name} is already closed! Store ${this.Name} can't be truncated...`));
                return;
            }
            const idbTransaction = this.IdbTranWrite;
            idbTransaction.objectStore(this.Name).clear();
            idbTransaction.oncomplete = () => {
                resolve();
            };
            idbTransaction.onerror = () => {
                reject(new ezdbexception_1.default(`${idbTransaction.error.message} (database ${this.database.Name})!`));
            };
            idbTransaction.onabort = () => {
                reject(new ezdbexception_1.default(`The truncation of store ${this.Name} (database ${this.Database.Name}) has been aborted!`));
            };
        });
        return promise;
    }
    query() {
        return new selectquery_1.default(this);
    }
}
exports.default = Store;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const dbmanager_1 = __webpack_require__(2);
const enums_1 = __webpack_require__(1);
(function () {
    if (!this.indexedDB) {
        this.ezdb = {
            get Loaded() { return false; }
        };
        return;
    }
    this.ezdb = dbmanager_1.default.Instance;
    this.EZDBUpdateType = enums_1.EZDBUpdateType;
    this.EZDBQueryReturn = enums_1.EZDBQueryReturn;
}).call(window);


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const keypathstore_1 = __webpack_require__(7);
const simplestore_1 = __webpack_require__(11);
const ezdbexception_1 = __webpack_require__(0);
const dbmanager_1 = __webpack_require__(2);
const transaction_1 = __webpack_require__(12);
class Database {
    constructor(idbDatabase) {
        this.idbDatabase = idbDatabase;
        this.closed = false;
        this.stores = new Map();
        Array.from(idbDatabase.objectStoreNames)
            .map(storeName => {
            const idbTable = this.idbDatabase.transaction(storeName).objectStore(storeName);
            if (idbTable.keyPath) {
                return new keypathstore_1.default(storeName, this, idbTable.keyPath, idbTable.autoIncrement);
            }
            else {
                return new simplestore_1.default(storeName, this, idbTable.autoIncrement);
            }
        })
            .forEach(store => this.stores.set(store.Name, store));
    }
    get Closed() {
        return this.closed;
    }
    get Name() {
        return this.idbDatabase.name;
    }
    get Version() {
        return this.idbDatabase.version;
    }
    get IdbDatabase() {
        return this.idbDatabase;
    }
    get StoreNames() {
        return Array.from(this.stores.keys());
    }
    get Stores() {
        return Array.from(this.stores.values());
    }
    store(storeName) {
        if (!this.stores.has(storeName)) {
            throw new ezdbexception_1.default(`Store ${storeName} doesn't exist in database ${this.Name}!`);
        }
        return this.stores.get(storeName);
    }
    close() {
        this.idbDatabase.close();
        this.closed = true;
        return this;
    }
    drop() {
        return dbmanager_1.default.Instance.drop(this.Name);
    }
    begintran() {
        if (this.closed) {
            throw new ezdbexception_1.default(`Can't start a transaction in database ${this.Name} because it's already closed!`);
        }
        return new transaction_1.default(this);
    }
}
exports.default = Database;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = __webpack_require__(4);
const updatequery_1 = __webpack_require__(9);
const deletequery_1 = __webpack_require__(10);
const ezdbexception_1 = __webpack_require__(0);
const enums_1 = __webpack_require__(1);
const dbmanager_1 = __webpack_require__(2);
class KeyPathStore extends store_1.default {
    constructor(name, database, keyPath, autoIncrement) {
        super(name, database, autoIncrement);
        this.keyPath = typeof keyPath === "string" ? [keyPath] : keyPath;
    }
    get Key() {
        return this.keyPath;
    }
    buildRequest(recordOrKey, idbTransaction, type) {
        let key;
        let record;
        let request;
        let idbStore = idbTransaction.objectStore(this.Name);
        switch (type) {
            case "ins":
                request = idbStore.add(recordOrKey);
                break;
            case "upd":
                request = idbStore.put(recordOrKey);
                break;
            case "del":
                if (recordOrKey instanceof Array || typeof recordOrKey !== "object") {
                    key = recordOrKey;
                }
                else {
                    record = recordOrKey;
                    key = this.Key.map(attr => record[attr]);
                    if (key.length === 1)
                        key = key[0];
                }
                request = idbStore.delete(key);
                break;
            default:
                record = recordOrKey;
                key = this.Key.map(attr => record[attr]);
                if (key.length === 1)
                    key = key[0];
                request = idbStore.get(key);
                break;
        }
        return request;
    }
    insert(records) {
        if (!(records instanceof Array))
            records = [records];
        const promise = new Promise((resolve, reject) => {
            if (this.Database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.Database.Name} is already closed! No data can be inserted in store ${this.Name}...`));
                return;
            }
            let numberOfAffectedRecords = 0;
            let error = undefined;
            const idbTransaction = this.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(error));
            for (let record of records) {
                if (error !== undefined) {
                    break;
                }
                try {
                    const insertRequest = this.buildRequest(record, idbTransaction, "ins");
                    insertRequest.onsuccess = () => {
                        if (this.AutoIncrement && record[this.Key[0]] === undefined) {
                            record[this.Key[0]] = insertRequest.result;
                        }
                        numberOfAffectedRecords++;
                    };
                    insertRequest.onerror = () => {
                        error = `${insertRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                    };
                }
                catch (e) {
                    error = `${e} Record: ${JSON.stringify(record)}`;
                    idbTransaction.abort();
                    break;
                }
            }
        });
        return promise;
    }
    update(records, type) {
        type = type || dbmanager_1.default.Instance.DefaultUpdateType;
        if (records === undefined) {
            return new updatequery_1.default(this);
        }
        if (!(records instanceof Array))
            records = [records];
        const promise = new Promise((resolve, reject) => {
            if (this.Database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.Database.Name} is already closed! No data can be updated in store ${this.Name}...`));
                return;
            }
            let numberOfAffectedRecords = 0;
            let error = undefined;
            const idbTransaction = this.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(error));
            switch (type) {
                case enums_1.EZDBUpdateType.REPLACE_INSERT:
                    for (let record of records) {
                        if (error !== undefined) {
                            break;
                        }
                        try {
                            const updateRequest = this.buildRequest(record, idbTransaction, "upd");
                            updateRequest.onsuccess = () => {
                                numberOfAffectedRecords++;
                            };
                            updateRequest.onerror = () => {
                                error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                            };
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(record)}`;
                            idbTransaction.abort();
                            break;
                        }
                    }
                    break;
                case enums_1.EZDBUpdateType.UPDATE_INSERT:
                    for (let record of records) {
                        if (error !== undefined) {
                            break;
                        }
                        try {
                            const queryRequest = this.buildRequest(record, idbTransaction, "sel");
                            queryRequest.onsuccess = () => {
                                let retrievedRecord = queryRequest.result;
                                let updatedRecord = retrievedRecord || record;
                                if (retrievedRecord) {
                                    Object.keys(record).forEach(attr => updatedRecord[attr] = record[attr]);
                                }
                                const updateRequest = this.buildRequest(updatedRecord, idbTransaction, "upd");
                                updateRequest.onsuccess = () => {
                                    numberOfAffectedRecords++;
                                };
                                updateRequest.onerror = () => {
                                    error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                                };
                            };
                            queryRequest.onerror = () => {
                                error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                            };
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(record)}`;
                            idbTransaction.abort();
                        }
                    }
                    break;
                case enums_1.EZDBUpdateType.UPDATE_EXISTING:
                    for (let record of records) {
                        if (error != undefined) {
                            break;
                        }
                        try {
                            const queryRequest = this.buildRequest(record, idbTransaction, "sel");
                            queryRequest.onsuccess = () => {
                                let retrievedRecord = queryRequest.result;
                                if (retrievedRecord) {
                                    Object.keys(record).forEach(attr => retrievedRecord[attr] = record[attr]);
                                    const updateRequest = this.buildRequest(retrievedRecord, idbTransaction, "upd");
                                    updateRequest.onsuccess = () => {
                                        numberOfAffectedRecords++;
                                    };
                                    updateRequest.onerror = () => {
                                        error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                                    };
                                }
                            };
                            queryRequest.onerror = () => {
                                error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                            };
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(record)}`;
                            idbTransaction.abort();
                        }
                    }
                    break;
                case enums_1.EZDBUpdateType.REPLACE_EXISTING:
                    for (let record of records) {
                        if (error !== undefined) {
                            break;
                        }
                        try {
                            const queryRequest = this.buildRequest(record, idbTransaction, "sel");
                            queryRequest.onsuccess = () => {
                                let retrievedRecord = queryRequest.result;
                                if (retrievedRecord) {
                                    const updateRequest = this.buildRequest(record, idbTransaction, "upd");
                                    updateRequest.onsuccess = () => {
                                        numberOfAffectedRecords++;
                                    };
                                    updateRequest.onerror = () => {
                                        error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                                    };
                                }
                            };
                            queryRequest.onerror = () => {
                                error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                            };
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(record)}`;
                            idbTransaction.abort();
                        }
                    }
                    break;
            }
        });
        return promise;
    }
    delete(recordsOrKeys) {
        if (recordsOrKeys === undefined) {
            return new deletequery_1.default(this);
        }
        if (!(recordsOrKeys instanceof Array))
            recordsOrKeys = [recordsOrKeys];
        const promise = new Promise((resolve, reject) => {
            if (this.Database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.Database.Name} is already closed! No data can be deleted in store ${this.Name}...`));
                return;
            }
            let numberOfAffectedRecords = 0;
            let error = undefined;
            const idbTransaction = this.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(error));
            for (let recordOrKey of recordsOrKeys) {
                if (error !== undefined) {
                    break;
                }
                try {
                    const queryRequest = this.buildRequest(recordOrKey, idbTransaction, "sel");
                    queryRequest.onsuccess = () => {
                        let retrievedRecord = queryRequest.result;
                        if (retrievedRecord) {
                            const deleteRequest = this.buildRequest(recordOrKey, idbTransaction, "del");
                            deleteRequest.onsuccess = () => {
                                numberOfAffectedRecords++;
                            };
                            deleteRequest.onerror = () => {
                                error = `${deleteRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (${this.Name})`;
                            };
                        }
                    };
                    queryRequest.onerror = () => {
                        error = `${queryRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (${this.Name})`;
                    };
                }
                catch (e) {
                    error = `${e} Record or key: ${JSON.stringify(recordOrKey)}`;
                    idbTransaction.abort();
                }
            }
        });
        return promise;
    }
}
exports.default = KeyPathStore;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = __webpack_require__(3);
const enums_1 = __webpack_require__(1);
const ezdbexception_1 = __webpack_require__(0);
class SelectQuery extends query_1.default {
    constructor(store) {
        super(store);
        this.returnedValues = enums_1.EZDBQueryReturn.VALUES;
    }
    values() {
        this.returnedValues = enums_1.EZDBQueryReturn.VALUES;
        return this;
    }
    keys() {
        this.returnedValues = enums_1.EZDBQueryReturn.KEYS;
        return this;
    }
    keyvalues() {
        this.returnedValues = enums_1.EZDBQueryReturn.KEYVALUES;
        return this;
    }
    indexvalues() {
        this.returnedValues = enums_1.EZDBQueryReturn.INDEXVALUES;
        return this;
    }
    keyindexvalues() {
        this.returnedValues = enums_1.EZDBQueryReturn.KEYINDEXVALUES;
        return this;
    }
    go() {
        let promise = new Promise((resolve, reject) => {
            let results = new Array();
            let error = undefined;
            const idbTransaction = this.store.IdbTranRead;
            idbTransaction.oncomplete = () => resolve(results);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(`${error}`));
            try {
                const isKeyCursor = this.returnedValues === enums_1.EZDBQueryReturn.KEYS;
                const request = this.buildRequest(idbTransaction, isKeyCursor, false);
                request.onsuccess = () => {
                    let cursor = request.result;
                    let reachedLimit = this.Limit !== 0 && results.length === this.Limit;
                    if (cursor && !reachedLimit) {
                        try {
                            switch (this.returnedValues) {
                                case enums_1.EZDBQueryReturn.VALUES:
                                    results.push(cursor.value);
                                    break;
                                case enums_1.EZDBQueryReturn.KEYS:
                                    results.push(cursor.primaryKey);
                                    break;
                                case enums_1.EZDBQueryReturn.KEYVALUES:
                                    results.push({
                                        key: cursor.primaryKey,
                                        value: cursor.value
                                    });
                                    break;
                                case enums_1.EZDBQueryReturn.INDEXVALUES:
                                    results.push(cursor.key);
                                    break;
                                case enums_1.EZDBQueryReturn.KEYINDEXVALUES:
                                    results.push({
                                        key: cursor.primaryKey,
                                        value: cursor.key,
                                    });
                                    break;
                            }
                            cursor.continue();
                        }
                        catch (e) {
                            error = `${e}`;
                            idbTransaction.abort();
                        }
                    }
                };
                request.onerror = () => {
                    error = `${request.error.message}`;
                };
            }
            catch (e) {
                error = `${e}`;
                idbTransaction.abort();
            }
        });
        return promise;
    }
    count() {
        let promise = new Promise((resolve, reject) => {
            let error = undefined;
            let count;
            const idbTransaction = this.store.IdbTranRead;
            idbTransaction.oncomplete = () => {
                if (this.Limit !== 0) {
                    count = Math.min(count, this.Limit);
                }
                resolve(count);
            };
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(`${error}`));
            try {
                const request = this.buildRequest(idbTransaction, false, true);
                request.onsuccess = () => {
                    count = request.result;
                };
                request.onerror = () => {
                    error = `${request.error.message}`;
                };
            }
            catch (e) {
                error = `${e}`;
                idbTransaction.abort();
            }
        });
        return promise;
    }
}
exports.default = SelectQuery;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = __webpack_require__(3);
const ezdbexception_1 = __webpack_require__(0);
class UpdateQuery extends query_1.default {
    constructor(store) {
        super(store);
    }
    set(setter) {
        this.setter = setter;
        return this;
    }
    go() {
        let promise = new Promise((resolve, reject) => {
            let error = undefined;
            let affectedRows = 0;
            if (!this.setter) {
                resolve(affectedRows);
                return;
            }
            const idbTransaction = this.store.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(affectedRows);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(`${error}`));
            try {
                const request = this.buildRequest(idbTransaction, false, false);
                request.onsuccess = () => {
                    let cursor = request.result;
                    let reachedLimit = this.Limit !== 0 && affectedRows === this.Limit;
                    if (cursor && !reachedLimit) {
                        let record;
                        if (typeof this.setter === "function") {
                            record = cursor.value;
                            this.setter(record);
                        }
                        else {
                            record = this.setter;
                        }
                        try {
                            cursor.update(record);
                            cursor.continue();
                            affectedRows++;
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(record)} (store: ${this.store.Name})`;
                            idbTransaction.abort();
                        }
                    }
                };
                request.onerror = () => {
                    error = `${request.error.message}`;
                };
            }
            catch (e) {
                error = `${e}`;
                idbTransaction.abort();
            }
        });
        return promise;
    }
}
exports.default = UpdateQuery;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = __webpack_require__(3);
const ezdbexception_1 = __webpack_require__(0);
class DeleteQuery extends query_1.default {
    constructor(store) {
        super(store);
    }
    go() {
        let promise = new Promise((resolve, reject) => {
            let error = undefined;
            let affectedRows = 0;
            const idbTransaction = this.store.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(affectedRows);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(`${error}`));
            try {
                const request = this.buildRequest(idbTransaction, true, false);
                request.onsuccess = () => {
                    let cursor = request.result;
                    let reachedLimit = this.Limit !== 0 && affectedRows === this.Limit;
                    if (cursor && !reachedLimit) {
                        let primaryKey = cursor.primaryKey;
                        try {
                            idbTransaction.objectStore(this.Store.Name).delete(primaryKey);
                            cursor.continue();
                            affectedRows++;
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(primaryKey)} (store: ${this.store.Name})`;
                            idbTransaction.abort();
                        }
                    }
                };
                request.onerror = () => {
                    error = `${request.error.message}`;
                };
            }
            catch (e) {
                error = `${e}`;
                idbTransaction.abort();
            }
        });
        return promise;
    }
}
exports.default = DeleteQuery;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = __webpack_require__(4);
const ezdbexception_1 = __webpack_require__(0);
const dbmanager_1 = __webpack_require__(2);
const enums_1 = __webpack_require__(1);
class SimpleStore extends store_1.default {
    constructor(name, database, autoIncrement) {
        super(name, database, autoIncrement);
    }
    get Key() {
        return null;
    }
    isKeyValueRecord(record) {
        return typeof record === "object" && record.hasOwnProperty("key") && record.hasOwnProperty("value");
    }
    buildRequest(recordOrKey, idbTransaction, type) {
        let key;
        let record;
        let request;
        let idbStore = idbTransaction.objectStore(this.Name);
        switch (type) {
            case "ins":
                key = undefined;
                record = recordOrKey;
                if (this.isKeyValueRecord(recordOrKey)) {
                    const keyValueRecord = recordOrKey;
                    key = keyValueRecord.key;
                    record = keyValueRecord.value;
                }
                request = idbStore.add(record, key);
                break;
            case "upd":
                key = undefined;
                record = recordOrKey;
                if (this.isKeyValueRecord(record)) {
                    const keyValueRecord = record;
                    key = keyValueRecord.key;
                    record = keyValueRecord.value;
                }
                request = idbStore.put(record, key);
                break;
            case "del":
                key = recordOrKey;
                if (this.isKeyValueRecord(recordOrKey)) {
                    const keyValueRecord = recordOrKey;
                    key = keyValueRecord.key;
                }
                request = idbStore.delete(key);
                break;
            default:
                key = recordOrKey;
                if (this.isKeyValueRecord(recordOrKey)) {
                    const keyValueRecord = recordOrKey;
                    key = keyValueRecord.key;
                }
                request = idbStore.get(key);
                break;
        }
        return request;
    }
    insert(records) {
        if (!(records instanceof Array))
            records = [records];
        const promise = new Promise((resolve, reject) => {
            if (this.Database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.Database.Name} is already closed! No data can be inserted in store ${this.Name}...`));
                return;
            }
            let numberOfAffectedRecords = 0;
            let error = undefined;
            const idbTransaction = this.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(error));
            for (let record of records) {
                if (error !== undefined) {
                    break;
                }
                try {
                    const insertRequest = this.buildRequest(record, idbTransaction, "ins");
                    insertRequest.onsuccess = () => {
                        numberOfAffectedRecords++;
                    };
                    insertRequest.onerror = () => {
                        error = `${insertRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                        idbTransaction.abort();
                    };
                }
                catch (e) {
                    error = `${e} Record: ${JSON.stringify(record)}`;
                    idbTransaction.abort();
                }
            }
        });
        return promise;
    }
    update(records, type) {
        if (!(records instanceof Array))
            records = [records];
        type = type || dbmanager_1.default.Instance.DefaultUpdateType;
        const promise = new Promise((resolve, reject) => {
            if (this.Database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.Database.Name} is already closed! No data can be updated in store ${this.Name}...`));
                return;
            }
            let numberOfAffectedRecords = 0;
            let error = undefined;
            const idbTransaction = this.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(error));
            switch (type) {
                case enums_1.EZDBUpdateType.REPLACE_INSERT:
                case enums_1.EZDBUpdateType.UPDATE_INSERT:
                    for (let record of records) {
                        if (error !== undefined) {
                            break;
                        }
                        try {
                            const updateRequest = this.buildRequest(record, idbTransaction, "upd");
                            updateRequest.onsuccess = () => {
                                numberOfAffectedRecords++;
                            };
                            updateRequest.onerror = () => {
                                error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                            };
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(record)}`;
                            idbTransaction.abort();
                            break;
                        }
                    }
                    break;
                case enums_1.EZDBUpdateType.REPLACE_EXISTING:
                case enums_1.EZDBUpdateType.UPDATE_EXISTING:
                    for (let record of records) {
                        if (error !== undefined) {
                            break;
                        }
                        if (!this.isKeyValueRecord(record))
                            continue;
                        try {
                            const queryRequest = this.buildRequest(record, idbTransaction, "sel");
                            queryRequest.onsuccess = () => {
                                let retrievedRecord = queryRequest.result;
                                if (retrievedRecord !== undefined) {
                                    const updateRequest = this.buildRequest(record, idbTransaction, "upd");
                                    updateRequest.onsuccess = () => {
                                        numberOfAffectedRecords++;
                                    };
                                    updateRequest.onerror = () => {
                                        error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                                    };
                                }
                            };
                            queryRequest.onerror = () => {
                                error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
                            };
                        }
                        catch (e) {
                            error = `${e} Record: ${JSON.stringify(record)}`;
                            idbTransaction.abort();
                            break;
                        }
                    }
                    break;
            }
        });
        return promise;
    }
    delete(recordsOrKeys) {
        if (!(recordsOrKeys instanceof Array))
            recordsOrKeys = [recordsOrKeys];
        const promise = new Promise((resolve, reject) => {
            if (this.Database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.Database.Name} is already closed! No data can be deleted in store ${this.Name}...`));
                return;
            }
            let numberOfAffectedRecords = 0;
            let error = undefined;
            const idbTransaction = this.IdbTranWrite;
            idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(error));
            for (let recordOrKey of recordsOrKeys) {
                if (error !== undefined) {
                    break;
                }
                try {
                    const queryRequest = this.buildRequest(recordOrKey, idbTransaction, "sel");
                    queryRequest.onsuccess = () => {
                        let retrievedRecord = queryRequest.result;
                        if (retrievedRecord !== undefined) {
                            const deleteRequest = this.buildRequest(recordOrKey, idbTransaction, "del");
                            deleteRequest.onsuccess = () => {
                                numberOfAffectedRecords++;
                            };
                            deleteRequest.onerror = () => {
                                error = `${deleteRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (${this.Name})`;
                            };
                        }
                    };
                    queryRequest.onerror = () => {
                        error = `${queryRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (${this.Name})`;
                    };
                }
                catch (e) {
                    error = `${e} Record: ${JSON.stringify(recordOrKey)}`;
                    idbTransaction.abort();
                    break;
                }
            }
        });
        return promise;
    }
}
exports.default = SimpleStore;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ezdbexception_1 = __webpack_require__(0);
const enums_1 = __webpack_require__(1);
class Transaction {
    constructor(database) {
        this.database = database;
        this.storeNames = new Set();
        this.tranUnits = new Array();
    }
    addTransactionUnit(dmlType, storeName, recordsOrKeys) {
        if (this.database.StoreNames.indexOf(storeName) === -1) {
            throw new ezdbexception_1.default(`Store ${storeName} not found in database ${this.database.Name}!`);
        }
        this.storeNames.add(storeName);
        let store = this.database.store(storeName);
        this.tranUnits.push({ recordsOrKeys, store, dmlType });
    }
    insert(storeName, records) {
        this.addTransactionUnit("ins", storeName, records);
        return this;
    }
    update(storeName, records) {
        this.addTransactionUnit("upd", storeName, records);
        return this;
    }
    delete(storeName, recordsOrKeys) {
        this.addTransactionUnit("del", storeName, recordsOrKeys);
        return this;
    }
    commit() {
        const promise = new Promise((resolve, reject) => {
            if (this.database.Closed) {
                reject(new ezdbexception_1.default(`Database ${this.database.Name} is already closed! Can't run this transaction...`));
                return;
            }
            let returnedAffectedRows = {
                "ins": 0,
                "upd": 0,
                "del": 0
            };
            let error = undefined;
            let idbTransaction = this.database.IdbDatabase.transaction(Array.from(this.storeNames), enums_1.EZDBTransactionType.READWRITE);
            idbTransaction.oncomplete = () => resolve(returnedAffectedRows);
            idbTransaction.onabort = () => reject(new ezdbexception_1.default(`${error}`));
            for (let tranUnit of this.tranUnits) {
                if (error !== undefined) {
                    break;
                }
                for (let recordOrKey of tranUnit.recordsOrKeys) {
                    if (error !== undefined) {
                        break;
                    }
                    try {
                        const request = tranUnit.store.buildRequest(recordOrKey, idbTransaction, tranUnit.dmlType);
                        request.onsuccess = () => {
                            returnedAffectedRows[tranUnit.dmlType]++;
                        };
                        request.onerror = () => {
                            error = `${request.error.message} Record: ${JSON.stringify(recordOrKey)}`;
                        };
                    }
                    catch (e) {
                        error = `${e}`;
                        idbTransaction.abort();
                    }
                }
            }
        });
        return promise;
    }
}
exports.default = Transaction;


/***/ })
/******/ ]);