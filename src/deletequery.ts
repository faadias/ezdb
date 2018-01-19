import Query from "./query";
import Store from "./store";
import EZDBException from "./ezdbexception";
import { EZDBErrorObject } from "./types";

export default class DeleteQuery extends Query {
	constructor(store : Store) {
		super(store)
	}

	go() : Promise<number> {
		let promise = new Promise<number>((resolve, reject) => {
			const error : EZDBErrorObject = {};
			let affectedRows = 0;


			const idbTransaction = this.store.IdbTranWrite;
			idbTransaction.oncomplete = () => resolve(affectedRows);
			idbTransaction.onabort = () => reject(new EZDBException(error));


			try {
				const request = this.buildRequest(idbTransaction, true, false);

				request.onsuccess = () => {
					let cursor : IDBCursor = request.result;
					let reachedLimit = this.Limit !== 0 && affectedRows === this.Limit;
					if (cursor && !reachedLimit) {
						let primaryKey = cursor.primaryKey;
						try {
							idbTransaction.objectStore(this.Store.Name).delete(primaryKey);	
							cursor.continue();

							affectedRows++;
						}
						catch (e) {
							error.msg = `${e} Record: ${JSON.stringify(primaryKey)} (store: ${this.store.Name})`;
							idbTransaction.abort();
						}
					}
				}

				request.onerror = () => {
					error.msg = `${request.error.message}`;
				}
			}
			catch (e) {
				error.msg = `${e}`;
				idbTransaction.abort();
			}
		});

		return promise;
	}
}