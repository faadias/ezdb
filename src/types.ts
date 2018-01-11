interface DatabaseConfig {
	database : string,
	version : number,
	tables : {
		[key : string] : TableConfig
	}

}

interface KeyConfig {
	keyPath : string | Array<string>,
	autoIncrement? : boolean
}

interface IndexConfig {
	name : string,
	columns : string | Array<string>,
	unique? : boolean
}

interface TableConfig {
	key : KeyConfig,
	indexes? : Array<IndexConfig>
	delindexes? : Array<string>
	drop? : boolean
}
