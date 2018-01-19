import { EZDBErrorObject } from "./types";

export default class EZDBException extends DOMException {
	constructor(error : EZDBErrorObject) {
		super(error.msg, "EZDBException");
	}
}