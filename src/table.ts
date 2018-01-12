enum UpdateType {
	REPLACE_EXISTING="replace",		//Replaces whole record; if record doesn't exist, does nothing
	UPDATE_EXISTING="update",		//Updates record according to the attributes given; if record doesn't exist, does nothing
	REPLACE_INSERT="replace_insert",//Replaces whole record; if record doesn't exist, inserts it
	UPDATE_INSERT="update_insert"	//Updates record according to the attributes given; if record doesn't exist, inserts it
}

class Table {
	private name : string;
	private database : Database;

	constructor(name : string, database : Database) {
		this.name = name;
		this.database = database;
	}

	get Name() {
		return this.name;
	}
	get Database() {
		return this.database;
	}
	get KeyPath() {
		const [idbTable] = this.IdbTableAndTranForRead;
		return idbTable.keyPath;
	}
	get AutoIncrement() {
		const [idbTable] = this.IdbTableAndTranForRead;
		return idbTable.autoIncrement;
	}

	private get IdbTableAndTranForWrite() : [IDBObjectStore, IDBTransaction] {
		const idbTransaction = database.IdbDatabase.transaction(this.name, TransactionType.READWRITE);
		const idbTable = idbTransaction.objectStore(this.name);
		return [idbTable,idbTransaction];
	}

	private get IdbTableAndTranForRead() : [IDBObjectStore, IDBTransaction] {
		const idbTransaction = database.IdbDatabase.transaction(this.name, TransactionType.READONLY);
		const idbTable = idbTransaction.objectStore(this.name);
		return [idbTable,idbTransaction];
	}

	truncate() {
		const table : Table = this;
		const database = table.database;
		
		const promise = new Promise<void>((resolve, reject) => {
			if (database.Closed) {
				reject(new Error(`Database ${database.Name} is already closed! Table ${table.Name} can't be truncated...`));
				return;
			}

			const [idbTable,idbTransaction] = table.IdbTableAndTranForWrite;

			idbTable.clear();
			
			idbTransaction.oncomplete = () => {
				resolve();
			}
			idbTransaction.onerror = () => {
				reject(new Error(`An error occurred while trying to truncate table ${table.Name} (database ${database.Name})!`));
			}
			idbTransaction.onabort = () => {
				reject(new Error(`The truncation of table ${table.Name} (database ${database.Name}) has been aborted!`));
			}
		});
		
		return promise;
	}

	insert(data : Array<TableRecord>) {
		const table = this;
		
		const promise = new Promise<DMLReturn>((resolve, reject) => {
			if (database.Closed) {
				reject (new Error(`Database ${database.Name} is already closed! No data can be inserted in table ${table.Name}...`));
				return;
			}

			const [idbTable,idbTransaction] = table.IdbTableAndTranForWrite;

			const keys = new Array<any>();
			let error : string;

			idbTransaction.oncomplete = () => resolve({records : keys.length, keys});
			idbTransaction.onabort = () => reject(error);

			for (let datum of data) {
				try {
					const insertRequest = idbTable.add(datum);
					insertRequest.onsuccess = () => {
						keys.push(insertRequest.result);
					}
					insertRequest.onerror = () => {
						if (!error) error = `${insertRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
					}
				} catch (error) {
					reject(`${error} Record: ${JSON.stringify(datum)}`);
					break;
				}
			}
		});
		
		return promise;
	}

	update(data : Array<TableRecord>, type : UpdateType=UpdateType.UPDATE_EXISTING) {
		const table = this;
		
		const promise = new Promise<DMLReturn>((resolve, reject) => {
			if (database.Closed) {
				reject(new Error(`Database ${database.Name} is already closed! No data can be updated in table ${table.Name}...`));
				return;
			}

			const [idbTable,idbTransaction] = table.IdbTableAndTranForWrite;
			const keyPath = idbTable.keyPath;

			const keys = new Array<any>();
			let error : string;

			idbTransaction.oncomplete = () => resolve({records : keys.length, keys});
			idbTransaction.onabort = () => reject(error);

			switch(type){
				case UpdateType.REPLACE_INSERT:
				for (let datum of data) {
					try {
						const updateRequest = idbTable.put(datum);
						updateRequest.onsuccess = () => {
							keys.push(updateRequest.result);
						}
						updateRequest.onerror = () => {
							if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
						}
					} catch (error) {
						reject(`${error} Record: ${JSON.stringify(datum)}`);
						break;
					}
				}
				break;
				
				case UpdateType.UPDATE_INSERT:
				for (let datum of data) {
					try {
						let key = typeof keyPath === "string" ? datum[keyPath] : keyPath.map(attr => datum[attr]);

						const queryRequest = idbTable.get(key);
						queryRequest.onsuccess = () => {
							let record = queryRequest.result;

							if (record) {
								Object.keys(datum).forEach(attr => record[attr] = datum[attr]);
							}
							else {
								record = datum;
							}
							
							const updateRequest = idbTable.put(record);
							updateRequest.onsuccess = () => {
								keys.push(updateRequest.result);
							}
							updateRequest.onerror = () => {
								if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
							}
						}
						queryRequest.onerror = () => {
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
						}
					} catch (error) {
						reject(`${error} Record: ${JSON.stringify(datum)}`);
						break;
					}
				}
				break;
				
				case UpdateType.UPDATE_EXISTING:
				for (let datum of data) {
					try {
						let key = typeof keyPath === "string" ? datum[keyPath] : keyPath.map(attr => datum[attr]);

						const queryRequest = idbTable.get(key);
						queryRequest.onsuccess = () => {
							let record = queryRequest.result;
							if (record) {
								Object.keys(datum).forEach(attr => record[attr] = datum[attr]);
								
								const updateRequest = idbTable.put(record);
								updateRequest.onsuccess = () => {
									keys.push(updateRequest.result);
								}
								updateRequest.onerror = () => {
									if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
								}
							}
						}
						queryRequest.onerror = () => {
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
						}
					} catch (error) {
						reject(`${error} Record: ${JSON.stringify(datum)}`);
						break;
					}
				}
				break;

				case UpdateType.REPLACE_EXISTING:
				for (let datum of data) {
					try {
						let key = typeof keyPath === "string" ? datum[keyPath] : keyPath.map(attr => datum[attr]);

						const queryRequest = idbTable.get(key);
						queryRequest.onsuccess = () => {
							let record = queryRequest.result;
							if (record) {
								const updateRequest = idbTable.put(datum);
								updateRequest.onsuccess = () => {
									keys.push(updateRequest.result);
								}
								updateRequest.onerror = () => {
									if (!error) error = `${updateRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
								}
							}
						}
						queryRequest.onerror = () => {
							if (!error) error = `${queryRequest.error.message} Record: ${JSON.stringify(datum)} (${table.Name})`;
						}
					} catch (error) {
						reject(`${error} Record: ${JSON.stringify(datum)}`);
						break;
					}
				}
				break;
			}
		});
		
		return promise;
	}
}