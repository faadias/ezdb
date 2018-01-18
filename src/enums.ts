export enum EZDBUpdateType {
	REPLACE_EXISTING="replace",		//Replaces whole record; if record doesn't exist, does nothing
	UPDATE_EXISTING="update",		//Updates record according to the attributes given; if record doesn't exist, does nothing
	REPLACE_INSERT="replace_insert",//Replaces whole record; if record doesn't exist, inserts it
	UPDATE_INSERT="update_insert"	//Updates record according to the attributes given; if record doesn't exist, inserts it
}

export enum EZDBTransactionType {
	READONLY = "readonly",
	READWRITE = "readwrite",
	VERSIONCHANGE = "versionchange"
}

export enum EZDBQueryReturn {
	VALUES = "values",
	KEYS = "keys",
	KEYVALUES = "keyvalues",
	INDEXVALUES = "indexvalues",
	KEYINDEXVALUES = "keyindexvalues"
}
