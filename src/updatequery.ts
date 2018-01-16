class UpdateQuery extends Query {
	private setter : (record : EZDBObjectStorable) => void;

	constructor(store : Store) {
		super(store);
	}

	set(setter : (record : EZDBObjectStorable) => void) {
		this.setter = setter;
		return this;
	}

	protected buildRequest() {
		return super.buildRequest(false, false);
	}

	go() : Promise<number> {
		let promise = new Promise<number>((resolve, reject) => {
			if (!this.setter) {
				reject("No setter specified for this update. Aborting...");
				return;
			}

			try {
				const [request, idbTransaction] = this.buildRequest();

				let affectedRows = 0;

				idbTransaction.oncomplete = () => {
					resolve(affectedRows);
				}
				idbTransaction.onerror = () => {
					reject(new EZDBException(`An error occurred while trying to perform an update in store ${this.Store.Name} (database ${this.Store.Database.Name})!`));
				}
				idbTransaction.onabort = () => {
					reject(new EZDBException(`An update in store ${this.Store.Name} (database ${this.Store.Database.Name}) has been aborted!`));
				}

				request.onsuccess = () => {
					let cursor : IDBCursorWithValue = request.result;
					let reachedLimit = this.Limit !== 0 && affectedRows === this.Limit;
					if (cursor && !reachedLimit) {
						let record : EZDBObjectStorable = cursor.value;
						this.setter(record);
						cursor.update(record);
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