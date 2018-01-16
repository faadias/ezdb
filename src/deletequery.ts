class DeleteQuery extends Query {
	constructor(store : Store) {
		super(store)
	}

	protected buildRequest() {
		return super.buildRequest(true, false);
	}

	go() : Promise<number> {
		let promise = new Promise<number>((resolve, reject) => {
			try {
				const [request, idbTransaction] = this.buildRequest();

				let affectedRows = 0;

				idbTransaction.oncomplete = () => {
					resolve(affectedRows);
				}
				idbTransaction.onerror = () => {
					reject(new EZDBException(`An error occurred while trying to perform a delete in store ${this.Store.Name} (database ${this.Store.Database.Name})!`));
				}
				idbTransaction.onabort = () => {
					reject(new EZDBException(`A delete in store ${this.Store.Name} (database ${this.Store.Database.Name}) has been aborted!`));
				}

				request.onsuccess = () => {
					let cursor : IDBCursor = request.result;
					let reachedLimit = this.Limit !== 0 && affectedRows === this.Limit;
					if (cursor && !reachedLimit) {
						idbTransaction.objectStore(this.Store.Name).delete(cursor.primaryKey);	
						cursor.continue();

						affectedRows++;
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