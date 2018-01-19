import DBManager from "./dbmanager";
import { EZDBUpdateType, EZDBQueryReturn } from "./enums";

(function(){
	if (!this.indexedDB) {
		this.ezdb = {
			get Loaded() { return false; }
		};
		return;
	}

	this.ezdb = DBManager.Instance;
	this.EZDBUpdateType = EZDBUpdateType;
	this.EZDBQueryReturn = EZDBQueryReturn;
}).call(window);

