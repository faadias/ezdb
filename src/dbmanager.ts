import EZDBException from "./ezdbexception";
import Database from "./database";
import { EZDBUpdateType } from "./enums";
import { EZDBDatabaseConfig } from "./types";

export default class DBManager {
	private static instance : DBManager;
	private dbs : Map<string,Database>;
	private defaultUpdateType : EZDBUpdateType;

	constructor() {
		this.dbs = new Map<string,Database>();
		this.defaultUpdateType = EZDBUpdateType.UPDATE_EXISTING;
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
	set DefaultUpdateType(value:EZDBUpdateType){
		this.defaultUpdateType = value;
	}

	isClosed(dbName : string) : boolean {
		let database = this.get(dbName);
		if (database) {
			return database.Closed;
		}

		throw new EZDBException(`Database ${dbName} could not be found!`);
	}

	open(dbName : string, dbVersion? : number, config? : EZDBDatabaseConfig) {
		const manager : DBManager = this;

		const promise = new Promise<Database>((resolve, reject) => {
			const request = indexedDB.open(dbName, dbVersion);

			request.onupgradeneeded = () => {
				if (!config) return;

				const idbDatabase : IDBDatabase = request.result;
				const storeSchemas = config.stores;

				for (let storeName in storeSchemas) {
					const storeConfig = storeSchemas[storeName];
					let idbStore : IDBObjectStore;
					
					let storeExistsInDB = idbDatabase.objectStoreNames.contains(storeName);
					if (storeExistsInDB) {
						if (storeConfig && storeConfig.drop) {
							try {
								idbDatabase.deleteObjectStore(storeName);
								continue;
							} catch (error) {
								reject(new EZDBException(`${error} Store: ${storeName}`));
								break;
							}
						}

						idbStore = request.transaction.objectStore(storeName);
					}
					else {
						try {
							idbStore = idbDatabase.createObjectStore(storeName, storeConfig && storeConfig.key ? storeConfig.key : undefined);
						} catch (error) {
							reject(new EZDBException(`${error} Store: ${storeName}`));
							break;
						}
					}
					
					if (storeConfig) {
						if (storeConfig.indexes) {
							storeConfig.indexes
								.filter(index => !idbStore.indexNames.contains(index.name))
								.forEach(index => {
									idbStore.createIndex(index.name, index.columns, { unique : index.unique });
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