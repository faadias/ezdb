enum TransactionType {
	READONLY = "readonly",
	READWRITE = "readwrite",
	VERSIONCHANGE = "versionchange"
}

class DBManager {
	private static instance : DBManager;
	private dbs : Map<string,Database>;
	private debug : boolean;

	constructor() {
		this.dbs = new Map<string,Database>();
		this.debug = false;
	}

	static get Instance() {
		return DBManager.instance = DBManager.instance || new DBManager();
	}

	get Debug() {
		return this.debug;
	}
	set Debug(value) {
		this.debug = value;
	}

	log(error : string) {
		if (this.Debug) console.log(error);
	}

	has(dbName : string) : boolean {
		return this.dbs.has(dbName);
	}
	get(dbName : string) : Database | undefined {
		return this.dbs.get(dbName);
	}

	isClosed(dbName : string) : boolean {
		if (this.has(dbName)) {
			return this.get(dbName)!.Closed;
		}

		throw `Database '${dbName}' could not be found!`;
	}

	open(config : DatabaseConfig) {
		let manager : DBManager = this;

		let promise = new Promise<Database>((resolve, reject) => {
			let dbName = config.database;
			let dbVersion = config.version;
			let tableSchemas = config.tables;
			
			let request = indexedDB.open(dbName, dbVersion);
			
			request.onupgradeneeded = () => {
				let idbDatabase : IDBDatabase = request.result;

				for (let tableName in tableSchemas) {
					let tableSchema = tableSchemas[tableName];
					let idbTable : IDBObjectStore;
					
					let tableExistsInDB = idbDatabase.objectStoreNames.contains(tableName);
					if (tableExistsInDB) {
						idbTable = idbDatabase
							.transaction(tableName, TransactionType.VERSIONCHANGE)
							.objectStore(tableName);
						
						if (tableSchema.drop) {
							idbDatabase.deleteObjectStore(tableName);
							return;
						}
					}
					else {
						idbTable = idbDatabase.createObjectStore(tableName, tableSchema.key);
					}
					
					if (tableSchema.indexes) {
						tableSchema.indexes
							.filter(index => !idbTable.indexNames.contains(index.name))
							.forEach(index => {
								idbTable.createIndex(index.name, index.columns, { unique : index.unique });
							});
					}
					
					if (tableSchema.delindexes) {
						tableSchema.delindexes
							.filter(indexName => idbTable.indexNames.contains(indexName))
							.forEach(indexName => {
								idbTable.deleteIndex(indexName);
						});
					}
				}
			};
			
			request.onblocked = () => {
				// If some other tab is loaded with the db, then it needs to be closed before we can proceed.
				manager.log(request.result.error);
				reject(`Please close all other tabs where this database '${dbName}' is open!`);
			};
			
			request.onsuccess = () => {
				let idbDatabase : IDBDatabase = request.result;
				let database : Database = new Database(idbDatabase);
				manager.dbs.set(dbName, database);
				resolve(database);
			}

			request.onerror = () => {
				manager.log(request.result.error);
				reject(`An error occurred while trying to open database '${dbName}'!`);
			}
		});
		return promise;
	}
}