import Store from "./store";
import UpdateQuery from "./updatequery";
import DeleteQuery from "./deletequery";
import EZDBException from "./ezdbexception";
import { EZDBUpdateType } from "./enums";
import { EZDBObjectStorable, EZDBKey, EZDBDMLType, EZDBPlainKey, EZDBTransactionObject, EZDBErrorObject } from "./types";
import Database from "./database";
import DBManager from "./dbmanager";

export default class KeyPathStore extends Store {
	protected keyPath : Array<string>;

	constructor(name : string, database : Database, keyPath : string | Array<string>, autoIncrement : boolean) {
		super(name, database, autoIncrement);
		this.keyPath = typeof keyPath === "string" ? [keyPath] : keyPath;
	}
	
	get Key() {
		return this.keyPath;
	}

	buildRequest(recordOrKey : EZDBObjectStorable | EZDBKey, idbTransaction : IDBTransaction, type : EZDBDMLType) {
		let key : EZDBKey;
		let record : EZDBObjectStorable; 
		let request : IDBRequest;
		let idbStore = idbTransaction.objectStore(this.Name);
		switch(type) {
			case "ins":
				request = idbStore.add(recordOrKey);
				break;

			case "upd":
				request = idbStore.put(recordOrKey);
				break;

			case "del":
				if (recordOrKey instanceof Array || typeof recordOrKey !== "object") { //EZDBKey === Array<EZDBPlainKey> | EZDBPlainKey
					key = recordOrKey;
				}
				else { //EZDBObjectStorable
					record = <EZDBObjectStorable>recordOrKey;
					key = <Array<EZDBPlainKey>> this.Key.map(attr => record[attr]);
					if (key.length === 1) key = key[0];
				}
				request = idbStore.delete(key);
				break;

			default: //sel
				record = <EZDBObjectStorable>recordOrKey;
				key = <Array<EZDBPlainKey>>this.Key.map(attr => record[attr]);
				if (key.length === 1) key = key[0];
				request = idbStore.get(key);
				break;
		}

		return request;
	}

	insert(records : Array<EZDBObjectStorable>, tranObject? : EZDBTransactionObject) {
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
						if (this.AutoIncrement && record[this.Key[0]] === undefined) {
							record[this.Key[0]] = insertRequest.result;
						}
						numberOfAffectedRecords++;
					}
					insertRequest.onerror = () => {
						error.msg = `${insertRequest.error.message} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
					}
				} catch (e) {
					error.msg = `${e} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
					idbTransaction.abort();
					break;
				}
			}
		});
		
		return promise;
	}

	update(records? : Array<EZDBObjectStorable>, type? : EZDBUpdateType, tranObject? : EZDBTransactionObject) : Promise<number> | UpdateQuery {
		type = type || DBManager.Instance.DefaultUpdateType;

		if (records === undefined) {
			return new UpdateQuery(this);
		}

		if (!(records instanceof Array)) records! = [records];

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
				
				case EZDBUpdateType.UPDATE_INSERT:
				for (let record of records) {
					if (error.msg !== undefined) {
						break;
					}

					try {
						const queryRequest = this.buildRequest(record, idbTransaction, "sel");
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							let updatedRecord = retrievedRecord || record;

							if (retrievedRecord) {
								Object.keys(record).forEach(attr => updatedRecord[attr] = record[attr]);
							}
							
							const updateRequest = this.buildRequest(updatedRecord, idbTransaction, "upd");
							updateRequest.onsuccess = () => {
								numberOfAffectedRecords++;
							}
							updateRequest.onerror = () => {
								error.msg = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
							}
						}
						queryRequest.onerror = () => {
							error.msg = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
						}
					} catch (e) {
						error.msg = `${e} Record: ${JSON.stringify(record)} (store: ${this.Name})`;
						idbTransaction.abort();
					}
				}
				break;
				
				case EZDBUpdateType.UPDATE_EXISTING:
				for (let record of records) {
					if (error.msg != undefined) {
						break;
					}

					try {
						const queryRequest = this.buildRequest(record, idbTransaction, "sel");
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord) {
								Object.keys(record).forEach(attr => retrievedRecord[attr] = record[attr]);
								
								const updateRequest = this.buildRequest(retrievedRecord, idbTransaction, "upd");
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
					}
				}
				break;

				case EZDBUpdateType.REPLACE_EXISTING:
				for (let record of records) {
					if (error.msg !== undefined) {
						break;
					}

					try {
						const queryRequest = this.buildRequest(record, idbTransaction, "sel");
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord) {
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
					}
				}
				break;
			}
		});
		
		return promise;
	}

	delete(recordsOrKeys? : Array<EZDBObjectStorable> | Array<EZDBKey>, tranObject? : EZDBTransactionObject) : Promise<number> | DeleteQuery {
		if (recordsOrKeys === undefined) {
			return new DeleteQuery(this);
		}

		if (!(recordsOrKeys instanceof Array)) recordsOrKeys! = [recordsOrKeys];

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
						if (retrievedRecord) {
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
					error.msg = `${e} Record or key: ${JSON.stringify(recordOrKey)} (store: ${this.Name})`;
					idbTransaction.abort();
				}
			}
		});
		
		return promise;
	}
}