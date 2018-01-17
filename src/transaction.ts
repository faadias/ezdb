class Transaction {
	private database : Database;
	private storeNames : Set<string>;
	private tranUnits : Array<EZDBTransactionUnit>;

	constructor(database : Database) {
		this.database = database;
		this.storeNames = new Set<string>();

		this.tranUnits = new Array<any>();
	}

	private addTransactionUnit(type : EZDBTransactionDML, storeName : string, recordsOrKeys : Array<EZDBStorable | EZDBKeyValueRecord | EZDBKey>) {
		if (this.database.StoreNames.indexOf(storeName) === -1) {
			throw new EZDBException(`Store ${storeName} not found in database ${this.database.Name}!`);
		}

		this.storeNames.add(storeName);
		this.tranUnits.push({
			records : recordsOrKeys,
			storeName : storeName,
			type : type
		});
	}

	insert(storeName : string, records : Array<EZDBStorable | EZDBKeyValueRecord>) {
		this.addTransactionUnit("ins", storeName, records)
		return this;
	}

	update(storeName : string, records : Array<EZDBStorable | EZDBKeyValueRecord>) {
		this.addTransactionUnit("upd", storeName, records)
		return this;
	}

	delete(storeName : string, recordsOrKeys : Array<EZDBStorable | EZDBKeyValueRecord | EZDBKey>) {
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
			let returnedAffectedRows : {[key:string] : number} = {
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

			this.tranUnits.forEach(unit => {
				const idbStore = idbTransaction.objectStore(unit.storeName);
				let request : IDBRequest;
				let type : string = unit.type;
				switch(type) {
					case "ins":
						unit.records.forEach((record : any) => {
							request = idbStore.add(record);
							request.onsuccess = () => {
								returnedAffectedRows[type]++;
							}
							request.onerror = () => {
								error = `${request.error.message} Record: ${JSON.stringify(record)}`;
							}
						});
						break;

					case "upd":
						unit.records.forEach((record : any) => {
							request = idbStore.put(record);
							request.onsuccess = () => {
								returnedAffectedRows[type]++;
							}
							request.onerror = () => {
								error = `${request.error.message} Record: ${JSON.stringify(record)}`;
							}
						});
						break;

					case "del":
						unit.records.forEach((record : any) => {
							request = idbStore.delete(record);
							request.onsuccess = () => {
								returnedAffectedRows[type]++;
							}
							request.onerror = () => {
								error = `${request.error.message} Record: ${JSON.stringify(record)}`;
							}
						});
						break;
				}
			});
		});
		
		return promise;
	}
}