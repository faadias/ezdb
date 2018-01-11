class Table {
	private name : string;
	private database : Database;

	constructor(name : string, database : Database) {
		this.name = name;
		this.database = database;
	}

	get Name() {
		return this.name;
	}

	get Database() {
		return this.database;
	}
}