import Query from "./query";
import Store from "./store";
import EZDBException from "./ezdbexception";

export default class DeleteQuery extends Query {
	constructor(store : Store) {
		super(store)
	}

	go() : Promise<number> {
		let promise = new Promise<number>((resolve, reject) => {
			try {
				const idbTransaction = this.store.IdbTranWrite;
				const request = this.buildRequest(idbTransaction, true, false);

				let affectedRows = 0;

				idbTransaction.oncomplete = () => {
					resolve(affectedRows);
				}
				idbTransaction.onabort = () => {
					reject(new EZDBException(`A delete in store ${this.Store.Name} (database ${this.Store.Database.Name}) has been aborted!`));
				}

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
						catch (error) {
							reject(new EZDBException(`${error} Key: ${JSON.stringify(primaryKey)} (${this.store.Name})`));
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