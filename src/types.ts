import Store from "./store";

export type EZDBDatabaseConfig = {
	stores : {
		[key : string] : EZDBStoreConfig | undefined | null
	}
}
export type EZDBStoreConfig = {
	key? : EZDBKeyConfig,
	indexes? : Array<EZDBIndexConfig>
	dropindexes? : Array<string>
	drop? : boolean
}
export type EZDBKeyConfig = {
	keyPath? : string | Array<string>,
	autoIncrement? : boolean
}
export type EZDBIndexConfig = {
	name : string,
	columns : string | Array<string>,
	unique? : boolean
}


export type EZDBDMLType = "ins" | "upd" | "del" | "sel";


export type EZDBTransactionDMLType = "ins" | "upd" | "del";
export type EZDBTransactionUnit = {
	recordsOrKeys : Array<EZDBStorable | EZDBKeyValuePair | EZDBKey>,
	store : Store,
	dmlType : EZDBTransactionDMLType
}
export type EZDBTransactionReturn = {
	"ins" : number,
	"upd" : number,
	"del" : number
}


export type EZDBCursorType = "next" | "prev" | "nextunique" | "prevunique";


export type EZDBPlainKey = number | string | Date;
export type EZDBKey = EZDBPlainKey | Array<EZDBPlainKey>

export type EZDBPlainStorable  = string | number | boolean | symbol | object;
export type EZDBObjectStorable = { [key:string] : EZDBPlainStorable };
export type EZDBStorable = EZDBPlainStorable | EZDBObjectStorable;

export type EZDBKeyValuePair = {
	key : EZDBPlainKey,
	value : EZDBPlainStorable
}
