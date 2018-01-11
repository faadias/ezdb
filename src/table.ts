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

	private get IdbTranAndTable() : [IDBTransaction, IDBObjectStore] {
		let idbTransaction = database.IdbDatabase.transaction(this.name, TransactionType.READWRITE);
		let idbTable = idbTransaction.objectStore(this.name);
		return [idbTransaction, idbTable];
	}

	truncate() {
		let table : Table = this;
		let database = table.database;
		
		if (database.Closed) {
			throw new Error(`Database ${database.Name} is already closed! Table ${table.name} can't be truncated...`);
		}
		
		let promise = new Promise((resolve, reject) => {
			let [idbTransaction, idbTable] = table.IdbTranAndTable;

			idbTable.clear();
			
			idbTransaction.oncomplete = () => {
				resolve(table);
			}
			idbTransaction.onerror = () => {
				reject(new Error(`An error occurred while trying to truncate table ${table.name} (database ${database.Name})!`));
			}
			idbTransaction.onabort = () => {
				reject(new Error(`The truncation of table ${table.name} (database ${database.Name}) has been aborted!`));
			}
		});
		
		return promise;
	}

	insert(...data : Array<{[key:string] : any}>) {
		let table = this;
		let database = table.database;
		
		if (database.Closed) {
			throw new Error(`Database ${database.Name} is already closed! No data can be inserted in table ${table.name}...`);
		}
		
		let promise = new Promise<any[]>((resolve, reject) => {
			let [idbTransaction, idbTable] = table.IdbTranAndTable;

			let keys = new Array<any>();
			
			data.forEach(datum => {
				let request = idbTable.add(datum);

				request.onsuccess = () => {
					keys.push(request.result);
				}
			});
			
			idbTransaction.oncomplete = () => {
				resolve(keys);
			};
			idbTransaction.onerror = () => {
				reject(new Error(`An error occurred while trying to insert data in table ${table.name} (database ${database.Name})!`));
			};
			idbTransaction.onabort = () => {
				reject(new Error(`An insertion in table ${table.name} (database ${database.Name}) has been aborted!`));
			};
		});
		
		return promise;
	}
}