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

	go() : Promise<Array<EZDBStorable> | Array<EZDBKeyValuePair> | Array<EZDBKey>> {
		let promise = new Promise<Array<EZDBStorable> | Array<EZDBKeyValuePair> | Array<EZDBKey>>((resolve, reject) => {
			
			let results = new Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>();
			let error : string | undefined = undefined;

			const idbTransaction = this.store.IdbTranRead;
			idbTransaction.oncomplete = () => resolve(results);
			idbTransaction.onabort = () => reject(new EZDBException(`${error}`));
			

			try {
				const isKeyCursor = this.returnedValues === EZDBQueryReturn.KEYS;
				const request = this.buildRequest(idbTransaction, isKeyCursor, false);

				request.onsuccess = () => {
					let cursor : IDBCursor = request.result;
					let reachedLimit = this.Limit !== 0 && results.length === this.Limit;
					if (cursor && !reachedLimit) {
						try {
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
						catch(e) {
							error = `${e}`;
							idbTransaction.abort();
						}
					}
				}

				request.onerror = () => {
					error = `${request.error.message}`;
				}
			}
			catch (e) {
				error = `${e}`;
				idbTransaction.abort();
			}
		});

		return promise;
	}

	count() : Promise<number> {
		let promise = new Promise<number>((resolve, reject) => {
			let error : string | undefined = undefined;
			let count : number;

			const idbTransaction = this.store.IdbTranRead;
			idbTransaction.oncomplete = () => {
				if (this.Limit !== 0) {
					count = Math.min(count, this.Limit);
				}
				resolve(count);
			}
			idbTransaction.onabort = () => reject(new EZDBException(`${error}`));
			
			try {
				const request = this.buildRequest(idbTransaction, false, true);

				request.onsuccess = () => {
					count = request.result;
				}
				request.onerror = () => {
					error = `${request.error.message}`;
				}
			}
			catch (e) {
				error = `${e}`;
				idbTransaction.abort();
			}
		});

		return promise;
	}
}