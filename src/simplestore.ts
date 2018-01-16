class SimpleStore extends Store {
	constructor(name : string, database : Database, autoIncrement : boolean) {
		super(name, database, autoIncrement);
	}

	get Key() {
		return null;
	}

	private isKeyValueRecord(record : any) {
		return typeof record === "object" && record.hasOwnProperty("key") && record.hasOwnProperty("value");
	}

	insert(records : Array<EZDBStorable | EZDBKeyValueRecord>) {
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
					let key : EZDBPlainKey | undefined = undefined;
					let value : EZDBStorable = record;

					if (this.isKeyValueRecord(record)) {
						const keyValueRecord = <EZDBKeyValueRecord>record;
						key = keyValueRecord.key;
						value = keyValueRecord.value;
					}

					const insertRequest = idbStore.add(value, key);
					insertRequest.onsuccess = () => {
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

	update(records : Array<EZDBStorable | EZDBKeyValueRecord>, type? : EZDBUpdateType) {
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
				case EZDBUpdateType.UPDATE_INSERT:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					let key : EZDBPlainKey | undefined = undefined;
					let value : EZDBStorable = record;

					if (this.isKeyValueRecord(record)) {
						const keyValueRecord = <EZDBKeyValueRecord>record;
						key = keyValueRecord.key;
						value = keyValueRecord.value;
					}

					try {
						const updateRequest = idbStore.put(value, key);
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
				
				case EZDBUpdateType.REPLACE_EXISTING:
				case EZDBUpdateType.UPDATE_EXISTING:
				for (let record of records) {
					if (transactionErrorOcurred) {
						break;
					}

					try {
						if (!this.isKeyValueRecord(record)) continue; //If I want to update an existing record, it's mandatory to inform the key

						const keyValueRecord = <EZDBKeyValueRecord>record;
						const key = keyValueRecord.key;
						const value = keyValueRecord.value;

						const queryRequest = idbStore.get(key);
						queryRequest.onsuccess = () => {
							let retrievedRecord = queryRequest.result;
							if (retrievedRecord !== undefined) {
								const updateRequest = idbStore.put(value, key);
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

	delete(recordsOrKeys : Array<EZDBKeyValueRecord | EZDBPlainKey>) : Promise<number> {
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
					let key : EZDBPlainKey = <EZDBPlainKey>recordOrKey;

					if (this.isKeyValueRecord(recordOrKey)) {
						const keyValueRecord = <EZDBKeyValueRecord>recordOrKey;
						key = keyValueRecord.key;
					}
					
					const queryRequest = idbStore.get(key);
					queryRequest.onsuccess = () => {
						let retrievedRecord = queryRequest.result;
						if (retrievedRecord !== undefined) {
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