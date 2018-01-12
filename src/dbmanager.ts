enum TransactionType {
	READONLY = "readonly",
	READWRITE = "readwrite",
	VERSIONCHANGE = "versionchange"
}

class DBManager {
	private static instance : DBManager;
	private dbs : Map<string,Database>;
	private defaultUpdateType : UpdateType;

	constructor() {
		this.dbs = new Map<string,Database>();
		this.defaultUpdateType = UpdateType.UPDATE_EXISTING;
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

	get DefaultUpdateType(){
		return this.defaultUpdateType;
	}
	set DefaultUpdateType(value:UpdateType){
		this.defaultUpdateType = value;
	}

	isClosed(dbName : string) : boolean {
		let database = this.get(dbName);
		if (database) {
			return database.Closed;
		}

		throw new EZDBException(`Database ${dbName} could not be found!`);
	}

	open(dbName : string, dbVersion? : number, config? : DatabaseConfig) {
		const manager : DBManager = this;

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
							try {
								idbDatabase.deleteObjectStore(tableName);
								continue;
							} catch (error) {
								reject(new EZDBException(`${error} Table: ${tableName}`));
								break;
							}
						}

						idbTable = request.transaction.objectStore(tableName);
					}
					else {
						try {
							idbTable = idbDatabase.createObjectStore(tableName, tableSchema.key);
						} catch (error) {
							reject(new EZDBException(`${error} Table: ${tableName}`));
							break;
						}
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
				return reject(new EZDBException(`Database ${dbName} is blocked by another connection. Check if it's being used by other browser tabs.`));
			};
		});

		return promise;
	}

	drop(dbName : string) {
		const manager = this;
		const database = manager.dbs.get(dbName);

		const promise = new Promise<boolean>((resolve, reject) => {
			if (!database) {
				reject(new EZDBException(`No database named ${dbName} is currently loaded in EZDB! Can't drop it...`));
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
				reject(new EZDBException(`Can't drop database ${dbName} because it's not closed (and might be in use by other browser tabs).`));
			};
		});
		
		return promise;
	}
}