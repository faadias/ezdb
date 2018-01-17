interface EZDBDatabaseConfig {
	stores : {
		[key : string] : EZDBStoreConfig | undefined | null
	}
}

interface EZDBStoreConfig {
	key? : EZDBKeyConfig,
	indexes? : Array<EZDBIndexConfig>
	dropindexes? : Array<string>
	drop? : boolean
}

interface EZDBKeyConfig {
	keyPath? : string | Array<string>,
	autoIncrement? : boolean
}

interface EZDBIndexConfig {
	name : string,
	columns : string | Array<string>,
	unique? : boolean
}


type EZDBTransactionUnit = {
	records : Array<EZDBStorable | EZDBKeyValueRecord | EZDBKey>,
	storeName : string,
	type : EZDBTransactionDML
}

type EZDBTransactionDML = "ins" | "upd" | "del";

type EZDBPlainKey = number | string | Date;
type EZDBKey = EZDBPlainKey | Array<EZDBPlainKey>

type EZDBPlainStorable  = string | number | boolean | symbol | object;
type EZDBObjectStorable = { [key:string] : EZDBPlainStorable };
type EZDBStorable = EZDBPlainStorable | EZDBObjectStorable;

type EZDBKeyValueRecord = {
	key : EZDBPlainKey,
	value : EZDBPlainStorable
}

type EZDBCursorType = "next" | "prev" | "nextunique" | "prevunique";