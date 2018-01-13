enum UpdateType {
	REPLACE_EXISTING="replace",		//Replaces whole record; if record doesn't exist, does nothing
	UPDATE_EXISTING="update",		//Updates record according to the attributes given; if record doesn't exist, does nothing
	REPLACE_INSERT="replace_insert",//Replaces whole record; if record doesn't exist, inserts it
	UPDATE_INSERT="update_insert"	//Updates record according to the attributes given; if record doesn't exist, inserts it
}

class Table {
	private name : string;
	private database : Database;
	private keyPath : string | Array<string>;
	private autoIncrement : boolean;

	constructor(name : string, database : Database) {
		this.name = name;
		this.database = database;

		let [idbTable] = this.IdbTableAndTranForRead;
		this.keyPath = idbTable.keyPath;
		this.autoIncrement = idbTable.autoIncrement;
	}

	get Name() {
		return this.name;
	}
	get Database() {
		return this.database;
	}
	get CompositeKey() {
		return typeof this.keyPath !== "string";
	}
	get AutoIncrement() {
		return this.autoIncrement;
	}

	private get IdbTableAndTranForWrite() : [IDBObjectStore, IDBTransaction] {
		const idbTransaction = this.database.IdbDatabase.transaction(this.name, TransactionType.READWRITE);
		const idbTable = idbTransaction.objectStore(this.name);
		return [idbTable,idbTransaction];
	}

	private get IdbTableAndTranForRead() : [IDBObjectStore, IDBTransaction] {
		const idbTransaction = this.database.IdbDatabase.transaction(this.name, TransactionType.READONLY);
		const idbTable = idbTransaction.objectStore(this.name);
		return [idbTable,idbTransaction];
	}

	truncate() {
		const promise = new Promise<void>((resolve, reject) => {
			if (this.database.Closed) {
				reject(new EZDBException(`Database ${this.database.Name} is already closed! Table ${this.name} can't be truncated...`));
				return;
			}

			const [idbTable,idbTransaction] = this.IdbTableAndTranForWrite;

			idbTable.clear();
			
			idbTransaction.oncomplete = () => {
				resolve();
			}
			idbTransaction.onerror = () => {
				reject(new EZDBException(`An error occurred while trying to truncate table ${this.name} (database ${this.database.Name})!`));
			}
			idbTransaction.onabort = () => {
				reject(new EZDBException(`The truncation of table ${this.name} (database ${this.database.Name}) has been aborted!`));
			}
		});
		
		return promise;
	}

	insert(records : Array<EZDBTableRecord>) {
		const promise = new Promise<number>((resolve, reject) => {
			if (this.database.Closed) {
				reject (new EZDBException(`Database ${this.database.Name} is already closed! No data can be inserted in table ${this.name}...`));
				return;
			}

			const [idbTable,idbTransaction] = this.IdbTableAndTranForWrite;

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
					const insertRequest = idbTable.add(record);
					insertRequest.onsuccess = () => {
						if (this.AutoIncrement) {
							let key = this.keyPath[0];
							record[key] = insertRequest.result;
						}
						numberOfAffectedRecords++;
					}
					insertRequest.onerror = () => {
						transactionErrorOcurred = true;
						if (!error) error = `${insertRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
					}
				} catch (error) {
					reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
					break;
				}
			}
		});
		
		return promise;
	}

	update(records : Array<EZDBTableRecord>, type? : UpdateType) {
		type = type || DBManager.Instance.DefaultUpdateType;

		const promise = new Promise<number>((resolve, reject) => {
			if (this.database.Closed) {
				reject(new EZDBException(`Database ${this.database.Name} is already closed! No data can be updated in table ${this.name}...`));
				return;
			}
			
			const [idbTable,idbTransaction] = this.IdbTableAndTranForWrite;
			
			let numberOfAffectedRecords = 0;
			let error : string;
			let transactionErrorOcurred = false;

			idbTransaction.oncomplete = () => resolve(numberOfAffectedRecords);
			idbTransaction.onabort = () => reject(new EZDBException(error));
			
			switch(type){
				case UpdateType.REPLACE_INSERT:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const updateRequest = idbTable.put(record);
						updateRequest.onsuccess = () => {
							numberOfAffectedRecords++;
						}
						updateRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
						}
					} catch (error) {
						reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
						break;
					}
				}
				break;
				
				case UpdateType.UPDATE_INSERT:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const key = typeof this.keyPath === "string" ? record[this.keyPath] : this.keyPath.map((attr : keyof EZDBTableRecord) => record[attr]);
						const queryRequest = idbTable.get(key);

						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;

							if (retrievedRecord) {
								Object.keys(record).forEach(attr => retrievedRecord[attr] = record[attr]);
							}
							else {
								retrievedRecord = record;
							}
							
							const updateRequest = idbTable.put(retrievedRecord);
							updateRequest.onsuccess = () => {
								numberOfAffectedRecords++;
							}
							updateRequest.onerror = () => {
								transactionErrorOcurred = true;
								if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
							}
						}
						queryRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
						}
					} catch (error) {
						reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
						break;
					}
				}
				break;
				
				case UpdateType.UPDATE_EXISTING:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const key = typeof this.keyPath === "string" ? record[this.keyPath] : this.keyPath.map((attr : keyof EZDBTableRecord) => record[attr]);

						const queryRequest = idbTable.get(key);
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord) {
								Object.keys(record).forEach(attr => retrievedRecord[attr] = record[attr]);
								
								const updateRequest = idbTable.put(retrievedRecord);
								updateRequest.onsuccess = () => {
									numberOfAffectedRecords++;
								}
								updateRequest.onerror = () => {
									transactionErrorOcurred = true;
									if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
								}
							}
						}
						queryRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
						}
					} catch (error) {
						reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
						break;
					}
				}
				break;

				case UpdateType.REPLACE_EXISTING:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						const key = typeof this.keyPath === "string" ? record[this.keyPath] : this.keyPath.map((attr : keyof EZDBTableRecord) => record[attr]);

						const queryRequest = idbTable.get(key);
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord) {
								const updateRequest = idbTable.put(record);
								updateRequest.onsuccess = () => {
									numberOfAffectedRecords++;
								}
								updateRequest.onerror = () => {
									transactionErrorOcurred = true;
									if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
								}
							}
						}
						queryRequest.onerror = () => {
							transactionErrorOcurred = true;
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
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

	delete(records : Array<EZDBTableRecord>) {
		const promise = new Promise<number>((resolve, reject) => {
			if (this.database.Closed) {
				reject(new EZDBException(`Database ${this.database.Name} is already closed! No data can be deleted in table ${this.name}...`));
				return;
			}
			
			const [idbTable,idbTransaction] = this.IdbTableAndTranForWrite;
			
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
					const key = typeof this.keyPath === "string" ? record[this.keyPath] : this.keyPath.map((attr : keyof EZDBTableRecord) => record[attr]);

					const deleteRequest = idbTable.delete(key);
					deleteRequest.onsuccess = () => {
						numberOfAffectedRecords++;
					}
					deleteRequest.onerror = () => {
						transactionErrorOcurred = true;
						if (!error) error = `${deleteRequest.error.message} Record: ${JSON.stringify(record)} (${this.name})`;
					}
				} catch (error) {
					reject(new EZDBException(`${error} Record: ${JSON.stringify(record)}`));
					break;
				}
			}
		});
		
		return promise;
	}
}