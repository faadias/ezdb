type EZDBDatabaseConfig = {
	stores : {
		[key : string] : EZDBStoreConfig | undefined | null
	}
}
type EZDBStoreConfig = {
	key? : EZDBKeyConfig,
	indexes? : Array<EZDBIndexConfig>
	dropindexes? : Array<string>
	drop? : boolean
}
type EZDBKeyConfig = {
	keyPath? : string | Array<string>,
	autoIncrement? : boolean
}
type EZDBIndexConfig = {
	name : string,
	columns : string | Array<string>,
	unique? : boolean
}


type EZDBTransactionUnit = {
	records : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>,
	storeName : string,
	type : EZDBTransactionDML
}
type EZDBTransactionDML = "ins" | "upd" | "del";


type EZDBCursorType = "next" | "prev" | "nextunique" | "prevunique";


type EZDBPlainKey = number | string | Date;
type EZDBKey = EZDBPlainKey | Array<EZDBPlainKey>

type EZDBPlainStorable  = string | number | boolean | symbol | object;
type EZDBObjectStorable = { [key:string] : EZDBPlainStorable };
type EZDBStorable = EZDBPlainStorable | EZDBObjectStorable;

type EZDBKeyValuePair = {
	key : EZDBPlainKey,
	value : EZDBPlainStorable
}
