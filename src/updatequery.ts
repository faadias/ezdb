import Query from "./query";
import Store from "./store";
import { EZDBObjectStorable } from "./types";
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
			if (!this.setter) {
				resolve(0);
				return;
			}

			try {
				const idbTransaction = this.store.IdbTranWrite;
				const request = this.buildRequest(idbTransaction, false, false);

				let affectedRows = 0;

				idbTransaction.oncomplete = () => resolve(affectedRows);
				idbTransaction.onabort = () => {
					reject(new EZDBException(`An update in store ${this.Store.Name} (database ${this.Store.Database.Name}) has been aborted!`));
				}
				
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
						catch (error) {
							reject(new EZDBException(`${error} Record: ${JSON.stringify(record)} (${this.store.Name})`));
						}
					}
				}
			}
			catch (error) {
				reject(new EZDBException(`${error}`));
			}
		});

		return promise;
	}
}