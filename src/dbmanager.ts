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

	open(dbName : string, dbVersion? : number, config? : DatabaseConfig) {
		const manager : DBManager = this;
		

		if (dbVersion && (!Number.isSafeInteger(dbVersion) || dbVersion < 1)) {
			throw new Error(`${dbVersion} is not a valid version. It should be an integer greater than 0`);
		}

		const promise = new Promise<Database>((resolve, reject) => {
			const request = indexedDB.open(dbName, dbVersion);

			request.onupgradeneeded = () => {
				if (!config) return;

				const idbDatabase : IDBDatabase = request.result;
				const tableSchemas = config.tables;

				for (let tableName in tableSchemas) {
					const tableSchema = tableSchemas[tableName];
					let idbTable : IDBObjectStore;
					
					let tableExistsInDB = idbDatabase.objectStoreNames.contains(tableName);
					if (tableExistsInDB) {
						if (tableSchema.drop) {
							idbDatabase.deleteObjectStore(tableName);
							continue;
						}

						idbTable = request.transaction.objectStore(tableName);
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
			
			request.onsuccess = () => {
				const idbDatabase : IDBDatabase = request.result;
				const database : Database = new Database(idbDatabase);
				manager.dbs.set(dbName, database);
				return resolve(database);
			};

			request.onerror = () => {
				return reject(request.error);
			};

			request.onblocked = () => {
				return reject(new Error(`Database ${dbName} is blocked by another connection. Check if it's being used by other browser tabs.`));
			};
		});

		return promise;
	}

	drop(dbName : string) {
		const manager = this;
		const database = manager.dbs.get(dbName);

		if (!database) {
			throw new Error(`No database named ${dbName} is currently loaded in EZDB! Can't drop it...`);
		}

		if (!database.Closed) {
			throw new Error(`Database ${dbName} must be closed before it can be dropped!`);
		}

		const promise = new Promise<boolean>((resolve, reject) => {
			const request = indexedDB.deleteDatabase(dbName);
		
			request.onsuccess = () => {
				manager.dbs.delete(dbName);
				return resolve(true);
			};
			request.onerror = () => {
				return reject(request.error);
			};
			request.onblocked = () => {
				return reject(new Error(`Database ${dbName} is blocked by another connection. Check if it's being used by other browser tabs.`));
			};
		});
		
		return promise;
	}
}