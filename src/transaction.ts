import Database from "./database";
import { EZDBTransactionUnit, EZDBTransactionDMLType, EZDBStorable, EZDBKeyValuePair, EZDBTransactionReturn, EZDBKey } from "./types";
import EZDBException from "./ezdbexception";
import { EZDBTransactionType } from "./enums";

export default class Transaction {
	private database : Database;
	private storeNames : Set<string>;
	private tranUnits : Array<EZDBTransactionUnit>;

	constructor(database : Database) {
		this.database = database;
		this.storeNames = new Set<string>();

		this.tranUnits = new Array<EZDBTransactionUnit>();
	}

	private addTransactionUnit(dmlType : EZDBTransactionDMLType, storeName : string, recordsOrKeys : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>) {
		if (this.database.StoreNames.indexOf(storeName) === -1) {
			throw new EZDBException(`Store ${storeName} not found in database ${this.database.Name}!`);
		}

		this.storeNames.add(storeName);
		let store = this.database.store(storeName);
		this.tranUnits.push({recordsOrKeys, store, dmlType});
	}

	insert(storeName : string, records : Array<EZDBStorable | EZDBKeyValuePair>) {
		this.addTransactionUnit("ins", storeName, records)
		return this;
	}

	update(storeName : string, records : Array<EZDBStorable | EZDBKeyValuePair>) {
		this.addTransactionUnit("upd", storeName, records)
		return this;
	}

	delete(storeName : string, recordsOrKeys : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>) {
		this.addTransactionUnit("del", storeName, recordsOrKeys)
		return this;
	}

	commit() {
		const promise = new Promise<{[key:string] : number}>((resolve, reject) => {
			if (this.database.Closed) {
				reject(new EZDBException(`Database ${this.database.Name} is already closed! Can't run this transaction...`));
				return;
			}
			
			let error : string;
			let idbTransaction = this.database.IdbDatabase.transaction(Array.from(this.storeNames), EZDBTransactionType.READWRITE);
			let returnedAffectedRows : EZDBTransactionReturn = {
				"ins" : 0,
				"upd" : 0,
				"del" : 0
			};

			idbTransaction.oncomplete = () => {
				resolve(returnedAffectedRows);
			}
			idbTransaction.onerror = () => {
				reject(new EZDBException(error));
			}
			idbTransaction.onabort = () => {
				reject(new EZDBException(`A transaction in database ${this.database.Name} has been aborted!`));
			}

			this.tranUnits.forEach(tranUnit => {
				for (let recordOrKey of tranUnit.recordsOrKeys) {
					if (error) break;

					const request : IDBRequest = tranUnit.store.buildRequest(recordOrKey, idbTransaction, tranUnit.dmlType);
					request.onsuccess = () => {
						returnedAffectedRows[tranUnit.dmlType]++;
					}
					request.onerror = () => {
						error = `${request.error.message} Record: ${JSON.stringify(recordOrKey)}`;
					}
				}
			});
		});
		
		return promise;
	}
}