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
	get TableNames() {
		return Array.from(this.tables.keys());
	}
}