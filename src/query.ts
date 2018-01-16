class Query {
	private store : Store;
	private distinctFlag : boolean;
	private ascFlag : boolean;
	private limitValue : number;
	private returnedValues : EZDBQueryReturn;
	private bounds : {
		upper? : { value : EZDBStorable, open : boolean },
		lower? : { value : EZDBStorable, open : boolean },
		equal? : { value : EZDBStorable }
	};
	private indexName? : string;

	constructor(store : Store) {
		this.store = store;
		this.distinctFlag = false;
		this.ascFlag = true;
		this.limitValue = 0;
		this.bounds = {};
		this.returnedValues = EZDBQueryReturn.VALUES;
	}

	asc() {
		this.ascFlag = true;
		return this;
	}

	desc() {
		this.ascFlag = false;
		return this;
	}

	distinct() {
		this.distinctFlag = true;
		return this;
	}

	limit(limit : number) {
		this.limitValue = Math.max(Math.trunc(limit), 0);
		return this;
	}

	index(indexName : string) {
		this.indexName = indexName;
		return this;
	}

	values() {
		this.returnedValues = EZDBQueryReturn.VALUES;
		return this;
	}

	keys() {
		this.returnedValues = EZDBQueryReturn.KEYS;
		return this;
	}

	keyvalues() {
		this.returnedValues = EZDBQueryReturn.KEYVALUES;
		return this;
	}

	indexvalues() {
		this.returnedValues = EZDBQueryReturn.INDEXVALUES;
		return this;
	}

	keyindexvalues() {
		this.returnedValues = EZDBQueryReturn.KEYINDEXVALUES;
		return this;
	}

	upperBound(value : EZDBStorable, open : boolean = false) {
		if (!this.bounds.equal) this.bounds.upper = {value, open};
		return this;
	}

	lowerBound(value : EZDBStorable, open : boolean = false) {
		if (!this.bounds.equal) this.bounds.lower = {value, open};
		return this;
	}

	equals(value : EZDBStorable) {
		this.bounds.equal = {value};
		delete this.bounds.lower;
		delete this.bounds.upper;
		return this;
	}

	private buildRange() : IDBKeyRange | undefined {
		let range : IDBKeyRange | undefined = undefined;
		if (this.bounds.equal) {
			range = IDBKeyRange.only(this.bounds.equal!.value);
		}
		else {
			if (this.bounds.upper && this.bounds.lower) {
				range = IDBKeyRange.bound(this.bounds.lower!.value, this.bounds.upper!.value, this.bounds.lower!.open, this.bounds.upper!.open);
			}
			else if (this.bounds.upper) {
				range = IDBKeyRange.upperBound(this.bounds.upper!.value, this.bounds.upper!.open);
			}
			else { //this.bounds.lower
				range = IDBKeyRange.lowerBound(this.bounds.lower!.value, this.bounds.lower!.open);
			}
		}

		return range;
	}

	private buildRequest(idbStore : IDBObjectStore, isCount : boolean) {
		let range = this.buildRange();

		let cursorType = this.ascFlag ? "next" : "prev";
		if (this.distinctFlag) cursorType += "unique";

		let querySource = this.indexName ? idbStore.index(this.indexName) : idbStore;

		if (isCount) {
			return querySource.count(range);
		}

		if (
			this.returnedValues === EZDBQueryReturn.VALUES ||
			this.returnedValues === EZDBQueryReturn.KEYVALUES ||
			this.returnedValues === EZDBQueryReturn.INDEXVALUES ||
			this.returnedValues === EZDBQueryReturn.KEYINDEXVALUES
		) {
			return querySource.openCursor(range, <EZDBCursorType>cursorType);
		}
		
		//HACK IDBObjectStore.openKeyCursor not yet recognized by typescript
		return (<IDBIndex>querySource).openKeyCursor(range, <EZDBCursorType>cursorType);
	}

	exec() {
		return this.go();
	}

	go() : Promise<Array<EZDBStorable> | Array<EZDBKeyValueRecord> | Array<EZDBKey>> {
		let promise = new Promise<Array<EZDBStorable> | Array<EZDBKeyValueRecord> | Array<EZDBKey>>((resolve, reject) => {
			
			try {
				const [idbStore,idbTransaction] = this.store.IdbStoreAndTranForRead;
				const request = this.buildRequest(idbStore, false);

				let results = new Array<EZDBStorable | EZDBKeyValueRecord | EZDBKey>();

				idbTransaction.oncomplete = () => {
					resolve(results);
				}
				idbTransaction.onerror = () => {
					reject(new EZDBException(`An error occurred while trying to perform a query in store ${this.store.Name} (database ${this.store.Database.Name})!`));
				}
				idbTransaction.onabort = () => {
					reject(new EZDBException(`A query in store ${this.store.Name} (database ${this.store.Database.Name}) has been aborted!`));
				}

				request.onsuccess = () => {
					let cursor : IDBCursor = request.result;
					let reachedLimit = this.limitValue !== 0 && results.length === this.limitValue;
					if (cursor && !reachedLimit) {
						switch (this.returnedValues) {
							case EZDBQueryReturn.VALUES:
								results.push((<IDBCursorWithValue>cursor).value);
								break;

							case EZDBQueryReturn.KEYS:
								results.push(cursor.primaryKey);
								break;

							case EZDBQueryReturn.KEYVALUES:
								results.push({
									key : cursor.primaryKey,
									value : (<IDBCursorWithValue>cursor).value
								});
								break;

							case EZDBQueryReturn.INDEXVALUES:
								results.push(cursor.key);
								break;

							case EZDBQueryReturn.KEYINDEXVALUES:
								results.push({
									key : cursor.primaryKey,
									value : cursor.key,
								});
								break;
						}
						
						cursor.continue();
					}
				}
			}
			catch (error) {
				reject(new EZDBException(`${error}`));
			}
		});

		return promise;
	}

	count() : Promise<number> {
		let promise = new Promise<number>((resolve, reject) => {
			try {
				const [idbStore,idbTransaction] = this.store.IdbStoreAndTranForRead;
				const request = this.buildRequest(idbStore, true);

				let count : number;

				idbTransaction.oncomplete = () => {
					if (this.limitValue !== 0) {
						count = Math.min(count, this.limitValue);
					}
					resolve(count);
				}
				idbTransaction.onerror = () => {
					reject(new EZDBException(`An error occurred while trying to count store ${this.store.Name} (database ${this.store.Database.Name})!`));
				}
				idbTransaction.onabort = () => {
					reject(new EZDBException(`A count in store ${this.store.Name} (database ${this.store.Database.Name}) has been aborted!`));
				}

				request.onsuccess = () => {
					count = request.result;
				}
			}
			catch (error) {
				reject(new EZDBException(`${error}`));
			}
		});

		return promise;
	}
}