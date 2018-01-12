class Database {
	private closed : boolean;
	private idbDatabase : IDBDatabase;
	private tables : Map<string, Table>;

	constructor(idbDatabase : IDBDatabase) {
		this.idbDatabase = idbDatabase;
		this.closed = false;

		this.tables = new Map<string, Table>();

		Array.from(idbDatabase.objectStoreNames)
			.map(tableName => new Table(tableName, this))
			.forEach(table => this.tables.set(table.Name, table));
	}

	get Closed() {
		return this.closed;
	}
	set Closed(value:boolean) {
		this.closed = value;
	}

	get Name() {
		return this.idbDatabase.name;
	}
	get Version() {
		return this.idbDatabase.version;
	}
	get IdbDatabase() {
		return this.idbDatabase;
	}
	get TableNames() {
		return Array.from(this.tables.keys());
	}
	get Tables() {
		return Array.from(this.tables.values());
	}

	table(tableName : string) : Table {
		if (!this.tables.has(tableName)) {
			throw new EZDBException(`Table ${tableName} doesn't exist in database ${this.Name}!`);
		}

		return this.tables.get(tableName)!;
	}

	close() {
		this.idbDatabase.close();
		this.closed = true;
		return this;
	}

	drop() {
		return DBManager.Instance.drop(this.Name);
	}

	begintran() {
		if (this.closed) {
			throw new EZDBException(`Can't start a transaction in database ${this.Name} because it's already closed!`);
		}

		return new Transaction(this);
	}
}