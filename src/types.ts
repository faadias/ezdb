interface EZDBDatabaseConfig {
	stores : {
		[key : string] : EZDBStoreConfig
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

interface EZDBStoreConfig {
	key : EZDBKeyConfig,
	indexes? : Array<EZDBIndexConfig>
	delindexes? : Array<string>
	drop? : boolean
}

interface EZDBStoreRecord {
	[key : string] : any
}

type EZDBKey = any | Array<any>;