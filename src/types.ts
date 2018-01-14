interface EZDBDatabaseConfig {
	tables : {
		[key : string] : EZDBTableConfig
	}

}

interface EZDBKeyConfig {
	keyPath : string | Array<string>,
	autoIncrement? : boolean
}

interface EZDBIndexConfig {
	name : string,
	columns : string | Array<string>,
	unique? : boolean
}

interface EZDBTableConfig {
	key : EZDBKeyConfig,
	indexes? : Array<EZDBIndexConfig>
	delindexes? : Array<string>
	drop? : boolean
}

interface EZDBTableRecord {
	[key : string] : any
}

type EZDBKey = any | Array<any>;