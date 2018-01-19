import Query from "./query";
import Store from "./store";
import { EZDBObjectStorable, EZDBErrorObject } from "./types";
import EZDBException from "./ezdbexception";

export default class UpdateQuery extends Query {
	private setter : EZDBObjectStorable | ((record : EZDBObjectStorable) => void);

	constructor(store : Store) {
		super(store);
	}

	set(setter : EZDBObjectStorable | ((record : EZDBObjectStorable) => void)) {
		this.setter = setter;
		return this;
	}

	go() : Promise<number> {
		let promise = new Promise<number>((resolve, reject) => {
			const error : EZDBErrorObject = {};
			let affectedRows = 0;

			if (!this.setter) {
				resolve(affectedRows);
				return;
			}

			const idbTransaction = this.store.IdbTranWrite;
			idbTransaction.oncomplete = () => resolve(affectedRows);
			idbTransaction.onabort = () => reject(new EZDBException(error));

			try {
				const request = this.buildRequest(idbTransaction, false, false);

				request.onsuccess = () => {
					let cursor : IDBCursorWithValue = request.result;
					let reachedLimit = this.Limit !== 0 && affectedRows === this.Limit;
					if (cursor && !reachedLimit) {
						let record : EZDBObjectStorable;
						if (typeof this.setter === "function") {
							record = cursor.value;
							this.setter(record);
						}
						else {
							record = this.setter;
						}

						try {
							cursor.update(record);
							cursor.continue();

							affectedRows++;
						}
						catch (e) {
							error.msg = `${e} Record: ${JSON.stringify(record)} (store: ${this.store.Name})`;
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