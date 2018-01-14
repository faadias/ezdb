class ObjectStore {
	private name : string;
	private database : Database;
	private autoIncrement : boolean;
	private keyPath : string | Array<string>;

	constructor(name : string, database : Database) {
		this.name = name;
		this.database = database;

		let [idbStore] = this.IdbStoreAndTranForRead;
		this.keyPath = idbStore.keyPath;
		this.autoIncrement = idbStore.autoIncrement;
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
	get CompositeKey() {
		return typeof this.keyPath !== "string";
	}

	private get IdbStoreAndTranForWrite() : [IDBObjectStore, IDBTransaction] {
		const idbTransaction = this.database.IdbDatabase.transaction(this.name, EZDBTransactionType.READWRITE);
		const idbStore = idbTransaction.objectStore(this.name);
		return [idbStore,idbTransaction];
	}

	private get IdbStoreAndTranForRead() : [IDBObjectStore, IDBTransaction] {
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

	insert(records : Array<EZDBStoreRecord>) {
		const promise = new Promise<number>((resolve, reject) => {
			if (this.Database.Closed) {
				reject (new EZDBException(`Database ${this.Database.Name} is already closed! No data can be inserted in store ${this.Name}...`));
				return;
			}

			const [idbStore,idbTransaction] = this.IdbStoreAndTranForWrite;

			let numberOfAffectedRecords = 0;
			let error : string;
			let transactionErrorOcurred = false;

			idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
			idbTransaction.onabort = () => reject(new EZDBException(error));

			for (let record of records) {
				if (transactionErrorOcurred) {
					break;
				}

				try {
					const insertRequest = idbStore.add(record);
					insertRequest.onsuccess = () => {
						let keyName = <string>this.keyPath;
						if (this.AutoIncrement && record[keyName] === undefined) {
							record[keyName] = insertRequest.result;
						}
						numberOfAffectedRecords++;
					}
					insertRequest.onerror = () => {
						transactionErrorOcurred = true;
						if (!error) error = `${insertRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
					}
				} catch (error) {
					reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
					break;
				}
			}
		});
		
		return promise;
	}

	update(records : Array<EZDBStoreRecord>, type? : EZDBUpdateType) {
		type = type || DBManager.Instance.DefaultUpdateType;

		const promise = new Promise<number>((resolve, reject) => {
			if (this.Database.Closed) {
				reject(new EZDBException(`Database ${this.Database.Name} is already closed! No data can be updated in store ${this.Name}...`));
				return;
			}
			
			const [idbStore,idbTransaction] = this.IdbStoreAndTranForWrite;
			
			let numberOfAffectedRecords = 0;
			let error : string;
			let transactionErrorOcurred = false;

			idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
			idbTransaction.onabort = () => reject(new EZDBException(error));
			
			switch(type){
				case EZDBUpdateType.REPLACE_INSERT:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const updateRequest = idbStore.put(record);
						updateRequest.onsuccess = () => {
							numberOfAffectedRecords++;
						}
						updateRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
						}
					} catch (error) {
						reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
						break;
					}
				}
				break;
				
				case EZDBUpdateType.UPDATE_INSERT:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const key = typeof this.keyPath === "string" ? record[this.keyPath] : this.keyPath.map((attr : keyof EZDBStoreRecord) => record[attr]);
						const queryRequest = idbStore.get(key);

						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;

							if (retrievedRecord) {
								Object.keys(record).forEach(attr => retrievedRecord[attr] = record[attr]);
							}
							else {
								retrievedRecord = record;
							}
							
							const updateRequest = idbStore.put(retrievedRecord);
							updateRequest.onsuccess = () => {
								numberOfAffectedRecords++;
							}
							updateRequest.onerror = () => {
								transactionErrorOcurred = true;
								if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
							}
						}
						queryRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
						}
					} catch (error) {
						reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
						break;
					}
				}
				break;
				
				case EZDBUpdateType.UPDATE_EXISTING:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const key = typeof this.keyPath === "string" ? record[this.keyPath] : this.keyPath.map((attr : keyof EZDBStoreRecord) => record[attr]);

						const queryRequest = idbStore.get(key);
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord) {
								Object.keys(record).forEach(attr => retrievedRecord[attr] = record[attr]);
								
								const updateRequest = idbStore.put(retrievedRecord);
								updateRequest.onsuccess = () => {
									numberOfAffectedRecords++;
								}
								updateRequest.onerror = () => {
									transactionErrorOcurred = true;
									if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
								}
							}
						}
						queryRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
						}
					} catch (error) {
						reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
						break;
					}
				}
				break;

				case EZDBUpdateType.REPLACE_EXISTING:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const key = typeof this.keyPath === "string" ? record[this.keyPath] : this.keyPath.map((attr : keyof EZDBStoreRecord) => record[attr]);

						const queryRequest = idbStore.get(key);
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord) {
								const updateRequest = idbStore.put(record);
								updateRequest.onsuccess = () => {
									numberOfAffectedRecords++;
								}
								updateRequest.onerror = () => {
									transactionErrorOcurred = true;
									if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
								}
							}
						}
						queryRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.Name})`;
						}
					} catch (error) {
						reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
						break;
					}
				}
				break;
			}
		});
		
		return promise;
	}

	delete(recordsOrKeys : Array<EZDBStoreRecord | EZDBKey>) {
		const promise = new Promise<number>((resolve, reject) => {
			if (this.Database.Closed) {
				reject(new EZDBException(`Database ${this.Database.Name} is already closed! No data can be deleted in store ${this.Name}...`));
				return;
			}
			
			const [idbStore,idbTransaction] = this.IdbStoreAndTranForWrite;
			
			let numberOfAffectedRecords = 0;
			let error : string;
			let transactionErrorOcurred = false;

			idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
			idbTransaction.onabort = () => reject(new EZDBException(error));
			

			for (let recordOrKey of recordsOrKeys) {
				if (transactionErrorOcurred) {
					break;
				}

				try {
					let key = recordOrKey;
					if (typeof recordOrKey === "object" && !(recordOrKey instanceof Array)) {
						key = typeof this.keyPath === "string" ? recordOrKey[this.keyPath] : this.keyPath.map((attr : keyof EZDBStoreRecord) => recordOrKey[attr]);
					}
					
					const queryRequest = idbStore.get(key);
					queryRequest.onsuccess = () => {
						let retrievedRecord = queryRequest.result;
						if (retrievedRecord) {
							const deleteRequest = idbStore.delete(key);
							deleteRequest.onsuccess = () => {
								numberOfAffectedRecords++;
							}
							deleteRequest.onerror = () => {
								transactionErrorOcurred = true;
								if (!error) error = `${deleteRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (${this.Name})`;
							}
						}
					}
					queryRequest.onerror = () => {
						transactionErrorOcurred = true;
						if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(recordOrKey)} (${this.Name})`;
					}
				} catch (error) {
					reject(new EZDBException(`${error} Record: ${JSON.stringify(recordOrKey)}`));
					break;
				}
			}
		});
		
		return promise;
	}
}