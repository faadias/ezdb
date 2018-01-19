import Store from "./store";
import { EZDBUpdateType } from "./enums";

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
	dmlType : EZDBTransactionDMLType,
	updateType? : EZDBUpdateType
};
export type EZDBTransactionObject = {
	idbTransaction : IDBTransaction,
	errors : Array<EZDBErrorObject>,
	rejects : Array<Function>,
	resolves : Array<Function>
};

export type EZDBErrorObject = {
	msg? : string
}


export type EZDBCursorType = "next" | "prev" | "nextunique" | "prevunique";


export type EZDBPlainKey = number | string | Date;
export type EZDBKey = EZDBPlainKey | Array<EZDBPlainKey>;

export type EZDBPlainStorable  = string | number | boolean | symbol | object;
export type EZDBObjectStorable = { [key:string] : EZDBPlainStorable };
export type EZDBStorable = EZDBPlainStorable | EZDBObjectStorable;

export type EZDBKeyValuePair = {
	key : EZDBPlainKey,
	value : EZDBPlainStorable
};
