import Store from "./store";
import Database from "./database";
import { EZDBStorable, EZDBKey, EZDBPlainKey, EZDBKeyValuePair, EZDBDMLType, EZDBTransactionObject, EZDBErrorObject } from "./types";
import EZDBException from "./ezdbexception";
import DBManager from "./dbmanager";
import { EZDBUpdateType } from "./enums";

export default class SimpleStore extends Store {
	constructor(name : string, database : Database, autoIncrement : boolean) {
		super(name, database, autoIncrement);
	}

	get Key() {
		return null;
	}

	private isKeyValueRecord(record : any) {
		return typeof record === "object" && record.hasOwnProperty("key") && record.hasOwnProperty("value");
	}

	buildRequest(recordOrKey : EZDBStorable | EZDBKey, idbTransaction : IDBTransaction, type : EZDBDMLType) {
		let key : EZDBPlainKey | undefined;
		let record : EZDBStorable; 
		let request : IDBRequest;
		let idbStore = idbTransaction.objectStore(this.Name);

		switch(type) {
			case "ins":
				key = undefined;
				record = recordOrKey;
				if (this.isKeyValueRecord(recordOrKey)) {
					const keyValueRecord = <EZDBKeyValuePair>recordOrKey;
					key = keyValueRecord.key;
					record = keyValueRecord.value;
				}
				request = idbStore.add(record, key);
				break;

			case "upd":
				key = undefined;
				record = recordOrKey;
				if (this.isKeyValueRecord(record)) {
					const keyValueRecord = <EZDBKeyValuePair>record;
					key = keyValueRecord.key;
					record = keyValueRecord.value;
				}

				request = idbStore.put(record, key);
				break;

			case "del":
				key = <EZDBPlainKey>recordOrKey;
				if (this.isKeyValueRecord(recordOrKey)) {
					const keyValueRecord = <EZDBKeyValuePair>recordOrKey;
					key = keyValueRecord.key;
				}

				request = idbStore.delete(key);
				break;

			default: //sel
				key = <EZDBPlainKey>recordOrKey;
				if (this.isKeyValueRecord(recordOrKey)) {
					const keyValueRecord = <EZDBKeyValuePair>recordOrKey;
					key = keyValueRecord.key;
				}

				request = idbStore.get(key);
				break;
		}

		return request;
	}

	insert(records : Array<EZDBStorable | EZDBKeyValuePair>, tranObject? : EZDBTransactionObject) {
		if (!(records instanceof Array)) records = [records];

		const promise = new Promise<number>((resolve, reject) => {
			if (this.Database.Closed) {
				reject (new EZDBException({msg : `Database ${this.Database.Name} is already closed! No data can be inserted in store ${this.Name}...`}));
				return;
			}

			let numberOfAffectedRecords = 0;
			const error : EZDBErrorObject = {};

			let idbTransaction : IDBTransaction;
			if (tranObject) {
				idbTransaction = tranObject.idbTransaction;
				tranObject.resolves.push(() => resolve(numberOfAffectedRecords));
				tranObject.rejects.push(reject);
				tranObject.errors.push(error);
			}
			else {
				idbTransaction = this.IdbTranWrite;
				idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
				idbTransaction.onabort = () => reject(new EZDBException(error));
			}

			for (let record of records) {
				if (error.msg !== undefined) {
					break;
				}

				try {				
					const insertRequest = this.buildRequest(record, idbTransaction, "ins");
					insertRequest.onsuccess = () => {
						numberOfAffectedRecords++;
					}
					insertRequest.onerror = () => {
						error.msg = `${insertRequest.error.message} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
						idbTransaction.abort();
					}
				} catch (e) {
					error.msg = `${e} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
					idbTransaction.abort();
				}
			}
		});
		
		return promise;
	}

	update(records : Array<EZDBStorable | EZDBKeyValuePair>, type? : EZDBUpdateType, tranObject? : EZDBTransactionObject) {
		if (!(records instanceof Array)) records = [records];

		type = type || DBManager.Instance.DefaultUpdateType;

		const promise = new Promise<number>((resolve, reject) => {
			if (this.Database.Closed) {
				reject(new EZDBException({msg : `Database ${this.Database.Name} is already closed! No data can be updated in store ${this.Name}...`}));
				return;
			}
			
			let numberOfAffectedRecords = 0;
			const error : EZDBErrorObject = {};

			let idbTransaction : IDBTransaction;
			if (tranObject) {
				idbTransaction = tranObject.idbTransaction;
				tranObject.resolves.push(() => resolve(numberOfAffectedRecords));
				tranObject.rejects.push(reject);
				tranObject.errors.push(error);
			}
			else {
				idbTransaction = this.IdbTranWrite;
				idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
				idbTransaction.onabort = () => reject(new EZDBException(error));
			}
			
			switch(type){
				case EZDBUpdateType.REPLACE_INSERT:
				case EZDBUpdateType.UPDATE_INSERT:
				for (let record of records) {
					if (error.msg !== undefined) {
						break;
					}

					try {
						const updateRequest = this.buildRequest(record, idbTransaction, "upd");
						updateRequest.onsuccess = () => {
							numberOfAffectedRecords++;
						}
						updateRequest.onerror = () => {
							error.msg = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
						}
					} catch (e) {
						error.msg = `${e} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
						idbTransaction.abort();
						break;
					}
				}
				break;
				
				case EZDBUpdateType.REPLACE_EXISTING:
				case EZDBUpdateType.UPDATE_EXISTING:
				for (let record of records) {
					if (error.msg !== undefined) {
						break;
					}

					if (!this.isKeyValueRecord(record)) continue; //If I want to update an existing record, it's mandatory to inform the key

					try {
						const queryRequest = this.buildRequest(record, idbTransaction, "sel");
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord !== undefined) {
								const updateRequest = this.buildRequest(record, idbTransaction, "upd");
								updateRequest.onsuccess = () => {
									numberOfAffectedRecords++;
								}
								updateRequest.onerror = () => {
									error.msg = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
								}
							}
						}
						queryRequest.onerror = () => {
							error.msg = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
						}
					} catch (e) {
						error.msg = `${e} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
						idbTransaction.abort();
						break;
					}
				}
				break;
			}
		});
		
		return promise;
	}

	delete(recordsOrKeys : Array<EZDBKeyValuePair | EZDBPlainKey>, tranObject? : EZDBTransactionObject) : Promise<number> {
		if (!(recordsOrKeys instanceof Array)) recordsOrKeys = [recordsOrKeys];

		const promise = new Promise<number>((resolve, reject) => {
			if (this.Database.Closed) {
				reject(new EZDBException({msg : `Database ${this.Database.Name} is already closed! No data can be deleted in store ${this.Name}...`}));
				return;
			}
			
			let numberOfAffectedRecords = 0;
			const error : EZDBErrorObject = {};

			let idbTransaction : IDBTransaction;
			if (tranObject) {
				idbTransaction = tranObject.idbTransaction;
				tranObject.resolves.push(() => resolve(numberOfAffectedRecords));
				tranObject.rejects.push(reject);
				tranObject.errors.push(error);
			}
			else {
				idbTransaction = this.IdbTranWrite;
				idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
				idbTransaction.onabort = () => reject(new EZDBException(error));
			}

			for (let recordOrKey of recordsOrKeys) {
				if (error.msg !== undefined) {
					break;
				}

				try {
					const queryRequest = this.buildRequest(recordOrKey, idbTransaction, "sel");
					queryRequest.onsuccess = () => {
						let retrievedRecord = queryRequest.result;
						if (retrievedRecord !== undefined) {
							const deleteRequest = this.buildRequest(recordOrKey, idbTransaction, "del");
							deleteRequest.onsuccess = () => {
								numberOfAffectedRecords++;
							}
							deleteRequest.onerror = () => {
								error.msg = `${deleteRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (store: ${this.Name})`;
							}
						}
					}
					queryRequest.onerror = () => {
						error.msg = `${queryRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (store: ${this.Name})`;
					}
				} catch (e) {
					error.msg = `${e} Record: ${JSON.stringify(recordOrKey)} (store: ${this.Name})`;
					idbTransaction.abort();
					break;
				}
			}
		});
		
		return promise;
	}
}