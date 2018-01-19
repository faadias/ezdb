import UpdateQuery from "./updatequery";
import DeleteQuery from "./deletequery";
import { EZDBStorable, EZDBKeyValuePair, EZDBKey, EZDBDMLType } from "./types";
import { EZDBUpdateType, EZDBTransactionType } from "./enums";
import SelectQuery from "./selectquery";
import EZDBException from "./ezdbexception";
import Database from "./database";

export default abstract class Store {
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

	get IdbTranWrite() : IDBTransaction {
		const idbTransaction = this.database.IdbDatabase.transaction(this.name, EZDBTransactionType.READWRITE);
		return idbTransaction;
	}

	get IdbTranRead() : IDBTransaction {
		const idbTransaction = this.database.IdbDatabase.transaction(this.name, EZDBTransactionType.READONLY);
		return idbTransaction;
	}

	truncate() {
		const promise = new Promise<void>((resolve, reject) => {
			if (this.Database.Closed) {
				reject(new EZDBException(`Database ${this.Database.Name} is already closed! Store ${this.Name} can't be truncated...`));
				return;
			}

			const idbTransaction = this.IdbTranWrite;

			idbTransaction.objectStore(this.Name).clear();
			
			idbTransaction.oncomplete = () => {
				resolve();
			}
			idbTransaction.onerror = () => {
				reject(new EZDBException(`${idbTransaction.error.message} (database ${this.database.Name})!`));
			}
			idbTransaction.onabort = () => {
				reject(new EZDBException(`The truncation of store ${this.Name} (database ${this.Database.Name}) has been aborted!`));
			}
		});
		
		return promise;
	}

	abstract buildRequest(recordOrKey : EZDBStorable | EZDBKeyValuePair | EZDBKey, idbTransaction : IDBTransaction, type : EZDBDMLType) : IDBRequest;

	abstract insert(records : Array<EZDBStorable | EZDBKeyValuePair>) : Promise<number>;
	abstract update(records? : Array<EZDBStorable | EZDBKeyValuePair>, type? : EZDBUpdateType) : Promise<number> | UpdateQuery;
	abstract delete(recordsOrKeys? : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>) : Promise<number> | DeleteQuery;

	query() {
		return new SelectQuery(this);
	}
}
