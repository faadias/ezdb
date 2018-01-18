import Query from "./query";
import Store from "./store";
import { EZDBQueryReturn } from "./enums";
import { EZDBStorable, EZDBKeyValuePair, EZDBKey } from "./types";
import EZDBException from "./ezdbexception";

export default class SelectQuery extends Query {
	private returnedValues : EZDBQueryReturn;

	constructor(store : Store) {
		super(store)
		this.returnedValues = EZDBQueryReturn.VALUES;
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

	protected buildRequest(isCount : boolean) {
		let isKeyCursor = this.returnedValues === EZDBQueryReturn.KEYS;
		return super.buildRequest(isKeyCursor, isCount);
	}

	go() : Promise<Array<EZDBStorable> | Array<EZDBKeyValuePair> | Array<EZDBKey>> {
		let promise = new Promise<Array<EZDBStorable> | Array<EZDBKeyValuePair> | Array<EZDBKey>>((resolve, reject) => {
			
			try {
				const [request, idbTransaction] = this.buildRequest(false);

				let results = new Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>();

				idbTransaction.oncomplete = () => {
					resolve(results);
				}
				idbTransaction.onerror = () => {
					reject(new EZDBException(`An error occurred while trying to perform a query in store ${this.Store.Name} (database ${this.Store.Database.Name})!`));
				}
				idbTransaction.onabort = () => {
					reject(new EZDBException(`A query in store ${this.Store.Name} (database ${this.Store.Database.Name}) has been aborted!`));
				}

				request.onsuccess = () => {
					let cursor : IDBCursor = request.result;
					let reachedLimit = this.Limit !== 0 && results.length === this.Limit;
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
				const [request,idbTransaction] = this.buildRequest(true);

				let count : number;

				idbTransaction.oncomplete = () => {
					if (this.Limit !== 0) {
						count = Math.min(count, this.Limit);
					}
					resolve(count);
				}
				idbTransaction.onerror = () => {
					reject(new EZDBException(`An error occurred while trying to count store ${this.Store.Name} (database ${this.Store.Database.Name})!`));
				}
				idbTransaction.onabort = () => {
					reject(new EZDBException(`A count in store ${this.Store.Name} (database ${this.Store.Database.Name}) has been aborted!`));
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