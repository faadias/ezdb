abstract class Store {
	protected name : string;
	protected database : Database;
	protected autoIncrement : boolean;

	constructor(name : string, database : Database, autoIncrement : boolean) {
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
	
	abstract get Key() : Array<string> | null;

	get IdbStoreAndTranForWrite() : [IDBObjectStore, IDBTransaction] {
		const idbTransaction = this.database.IdbDatabase.transaction(this.name, EZDBTransactionType.READWRITE);
		const idbStore = idbTransaction.objectStore(this.name);
		return [idbStore,idbTransaction];
	}

	get IdbStoreAndTranForRead() : [IDBObjectStore, IDBTransaction] {
		const idbTransaction = this.database.IdbDatabase.transaction(this.name, EZDBTransactionType.READONLY);
		const idbStore = idbTransaction.objectStore(this.name);
		return [idbStore,idbTransaction];
	}

	truncate() {
		const promise = new Promise<void>((resolve, reject) => {
			if (this.Database.Closed) {
				reject(new EZDBException(`Database ${this.Database.Name} is already closed! Store ${this.Name} can't be truncated...`));
				return;
			}

			const [idbStore,idbTransaction] = this.IdbStoreAndTranForWrite;

			idbStore.clear();
			
			idbTransaction.oncomplete = () => {
				resolve();
			}
			idbTransaction.onerror = () => {
				reject(new EZDBException(`An error occurred while trying to truncate store ${this.Name} (database ${this.database.Name})!`));
			}
			idbTransaction.onabort = () => {
				reject(new EZDBException(`The truncation of store ${this.Name} (database ${this.Database.Name}) has been aborted!`));
			}
		});
		
		return promise;
	}

	abstract insert(records : Array<EZDBStorable | EZDBKeyValuePair>) : Promise<number>;
	abstract update(records? : Array<EZDBStorable | EZDBKeyValuePair>, type? : EZDBUpdateType) : Promise<number> | UpdateQuery;
	abstract delete(recordsOrKeys? : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>) : Promise<number> | DeleteQuery;

	query() {
		return new SelectQuery(this);
	}
}
