import DBManager from "./dbmanager";
import { EZDBUpdateType, EZDBQueryReturn } from "./enums";

(function(){
	this.ezdb = DBManager.Instance;
	this.EZDBUpdateType = EZDBUpdateType;
	this.EZDBQueryReturn = EZDBQueryReturn;
}).call(window);

