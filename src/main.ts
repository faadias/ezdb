import DBManager from "./dbmanager";
import { EZDBUpdateType, EZDBQueryReturn } from "./enums";

(function(){
	if (!this.indexedDB) {
		console.log("IndexedDB not supported!");
		return;
	}

	this.ezdb = DBManager.Instance;
	this.EZDBUpdateType = EZDBUpdateType;
	this.EZDBQueryReturn = EZDBQueryReturn;
}).call(window);

