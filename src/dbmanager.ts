enum TransactionType {
	READONLY = "readonly",
	READWRITE = "readwrite",
	VERSIONCHANGE = "versionchange"
}

class DBManager {
	private static instance : DBManager;
	private dbs : Map<string,Database>;

	constructor() {
		this.dbs = new Map<string,Database>();
	}

	static get Instance() {
		return DBManager.instance = DBManager.instance || new DBManager();
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

		throw new Error(`Database ${dbName} could not be found!`);
	}

	open(dbName : string, dbVersion : number=1, config? : DatabaseConfig) {
		let manager : DBManager = this;
		
		let promise = new Promise<Database>((resolve, reject) => {
			let request = indexedDB.open(dbName, dbVersion);

			request.onupgradeneeded = () => {
				if (!config) return;

				let idbDatabase : IDBDatabase = request.result;
				let tableSchemas = config.tables;

				for (let tableName in tableSchemas) {
					let tableSchema = tableSchemas[tableName];
					let idbTable : IDBObjectStore;
					
					let tableExistsInDB = idbDatabase.objectStoreNames.contains(tableName);
					if (tableExistsInDB) {
						if (tableSchema.drop) {
							idbDatabase.deleteObjectStore(tableName);
							continue;
						}

						idbTable = idbDatabase
							.transaction(tableName, TransactionType.VERSIONCHANGE)
							.objectStore(tableName);
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
				reject(new Error(`Database ${dbName} is blocked by another connection. Check if it's being used by other browser tabs.`));
			};
			
			request.onsuccess = () => {
				let idbDatabase : IDBDatabase = request.result;
				let database : Database = new Database(idbDatabase);
				manager.dbs.set(dbName, database);
				resolve(database);
			}

			request.onerror = () => {
				reject(new Error(`An error occurred when trying to open, create or update database ${dbName}!`));
			}
		});
		return promise;
	}

	drop(dbName : string) {
		let manager = this;
		let database = manager.dbs.get(dbName);

		if (!database) {
			throw new Error(`No database named ${dbName} is currently loaded in EZDB! Can't drop it...`);
		}

		if (!database.Closed) {
			throw new Error(`Database ${dbName} must be closed before it can be dropped!`);
		}

		let promise = new Promise<boolean>((resolve, reject) => {
			let request = indexedDB.deleteDatabase(dbName);
		
			request.onsuccess = () => {
				manager.dbs.delete(dbName);
				resolve(true);
			}
			request.onerror = () => {
				reject(new Error(`An error occurred when trying to drop database ${dbName}!`));
			}
			request.onblocked = () => {
				reject(new Error(`Database ${dbName} is blocked by another connection. Check if it's being used by other browser tabs.`));
			}
		});
		
		return promise;
	}
}