abstract class Query {
	private store : Store;
	private distinctFlag : boolean;
	private ascFlag : boolean;
	private limitValue : number;
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
	}

	get Store() {
		return this.store;
	}
	get Limit() {
		return this.limitValue;
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

	protected buildRange() : IDBKeyRange | undefined {
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

	protected buildRequest(isKeyCursor : boolean, isCount : boolean) : [IDBRequest,IDBTransaction] {
		const [idbStore,idbTransaction] = this instanceof SelectQuery ? this.store.IdbStoreAndTranForRead : this.store.IdbStoreAndTranForWrite;

		let range = this.buildRange();

		let cursorType = this.ascFlag ? "next" : "prev";
		if (this.distinctFlag) cursorType += "unique";

		let querySource = this.indexName ? idbStore.index(this.indexName) : idbStore;
		let request : IDBRequest;

		if (isCount) {
			request = querySource.count(range);
		}
		else if (isKeyCursor) {
			//HACK IDBObjectStore.openKeyCursor not yet recognized by typescript
			request = (<IDBIndex>querySource).openKeyCursor(range, <EZDBCursorType>cursorType);
		}
		else {
			request = querySource.openCursor(range, <EZDBCursorType>cursorType);
		}

		return [request, idbTransaction];
	}

	abstract go() : Promise<any>;

	exec() {
		return this.go();
	}
}