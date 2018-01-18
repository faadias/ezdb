import Store from "./store";
import KeyPathStore from "./keypathstore";
import SimpleStore from "./simplestore";
import EZDBException from "./ezdbexception";
import DBManager from "./dbmanager";
import Transaction from "./transaction";

export default class Database {
	private closed : boolean;
	private idbDatabase : IDBDatabase;
	private stores : Map<string, Store>;

	constructor(idbDatabase : IDBDatabase) {
		this.idbDatabase = idbDatabase;
		this.closed = false;

		this.stores = new Map<string, KeyPathStore>();

		Array.from(idbDatabase.objectStoreNames)
			.map(storeName => {
				const idbTable = this.idbDatabase.transaction(storeName).objectStore(storeName);
				if (idbTable.keyPath) {
					return new KeyPathStore(storeName, this, idbTable.keyPath, idbTable.autoIncrement);
				}
				else {
					return new SimpleStore(storeName, this, idbTable.autoIncrement);
				}
			})
			.forEach(store => this.stores.set(store.Name, store));
	}

	get Closed() {
		return this.closed;
	}
	set Closed(value:boolean) {
		this.closed = value;
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

	store(storeName : string) : Store {
		if (!this.stores.has(storeName)) {
			throw new EZDBException(`Store ${storeName} doesn't exist in database ${this.Name}!`);
		}

		return this.stores.get(storeName)!;
	}

	close() {
		this.idbDatabase.close();
		this.closed = true;
		return this;
	}

	drop() {
		return DBManager.Instance.drop(this.Name);
	}

	begintran() {
		if (this.closed) {
			throw new EZDBException(`Can't start a transaction in database ${this.Name} because it's already closed!`);
		}

		return new Transaction(this);
	}
}