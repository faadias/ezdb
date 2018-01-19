import Database from "./database";
import { EZDBTransactionUnit, EZDBTransactionDMLType, EZDBStorable, EZDBKeyValuePair, EZDBKey, EZDBTransactionObject, EZDBErrorObject } from "./types";
import EZDBException from "./ezdbexception";
import { EZDBTransactionType, EZDBUpdateType } from "./enums";
import DBManager from "./dbmanager";

export default class Transaction {
	private database : Database;
	private storeNames : Set<string>;
	private tranUnits : Array<EZDBTransactionUnit>;

	constructor(database : Database) {
		this.database = database;
		this.storeNames = new Set<string>();

		this.tranUnits = new Array<EZDBTransactionUnit>();
	}

	private addTransactionUnit(dmlType : EZDBTransactionDMLType, storeName : string, recordsOrKeys : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>, updateType? : EZDBUpdateType) {
		if (this.database.StoreNames.indexOf(storeName) === -1) {
			throw new EZDBException({msg : `Store ${storeName} not found in database ${this.database.Name}!`});
		}

		this.storeNames.add(storeName);
		let store = this.database.store(storeName);

		updateType =  updateType || DBManager.Instance.DefaultUpdateType;
		this.tranUnits.push({recordsOrKeys, store, dmlType, updateType});
	}

	insert(storeName : string, records : Array<EZDBStorable | EZDBKeyValuePair>) {
		this.addTransactionUnit("ins", storeName, records)
		return this;
	}

	update(storeName : string, records : Array<EZDBStorable | EZDBKeyValuePair>, type? : EZDBUpdateType) {
		this.addTransactionUnit("upd", storeName, records, type)
		return this;
	}

	delete(storeName : string, recordsOrKeys : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>) {
		this.addTransactionUnit("del", storeName, recordsOrKeys)
		return this;
	}

	commit() {
		if (this.database.Closed) {
			return Promise.reject(new EZDBException({msg : `Database ${this.database.Name} is already closed! Can't run this transaction...`}));
		}

		const promises = new Array<Promise<number>>();
		
		const idbTransaction = this.database.IdbDatabase.transaction(Array.from(this.storeNames), EZDBTransactionType.READWRITE);

		const tranObject : EZDBTransactionObject = {
			idbTransaction : idbTransaction,
			errors : new Array<EZDBErrorObject>(),
			rejects : new Array<Function>(),
			resolves : new Array<Function>()
		};

		idbTransaction.oncomplete = () => tranObject.resolves.forEach(resolve => resolve());
		idbTransaction.onabort = () => {
			const error = tranObject.errors.find(error => error.msg !== undefined);
			const msg = error ? error.msg : "The transaction was aborted!";
			tranObject.rejects.forEach(reject => reject(msg));
		};

		for (let tranUnit of this.tranUnits) {
			let promise : Promise<number> | undefined = undefined;
			switch(tranUnit.dmlType) {
				case "ins":
					promise = tranUnit.store.insert(tranUnit.recordsOrKeys, tranObject);
					break;
				case "upd":
					let updateType = tranUnit.updateType;
					promise = <Promise<number>>tranUnit.store.update(tranUnit.recordsOrKeys, updateType, tranObject);
					break;
				case "del":
					promise = <Promise<number>>tranUnit.store.delete(tranUnit.recordsOrKeys, tranObject);
					break;
			}

			if (promise !== undefined) {
				promises.push(promise);
			}
		}
		
		console.log(tranObject);
		return Promise.all(promises);
	}
}