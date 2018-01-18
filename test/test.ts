import DBManager from "../src/dbmanager";
import Database from "../src/database";
import * as EZDBTypes from "../src/types";

declare var ezdb : DBManager;
const defaultCatch = (error : string) => document.body.innerText = error;

this.ezdb = ezdb;
this.defaultCatch = defaultCatch;

let database : Database;

ezdb.open("MyFirstDatabase", 3, {
	stores : {
		person : {
			key : { keyPath : "id" },
			indexes : [
				{ name : "firstname", columns : "firstname", unique : false },
				{ name : "lastname", columns : "lastname", unique : false },
				{ name : "age", columns : "age", unique : false },
				{ name : "name", columns : ["firstname","lastname"], unique : false }
			]
		},
		email : {
			key : { keyPath : "key", autoIncrement : true },
			indexes : [
				{ name : "email", columns : "email", unique : true },
				{ name : "category", columns : "category", unique : false }
			]
		},
		person_email : {
			key : { keyPath : ["person_id","email_key"] }
		},
		preferences : {},
		cart : {
			key : { autoIncrement : true }
		}
	}
})
.then(db => {
	database = db;
	document.body.innerText = "Database has been created/opened!";
	document.body.innerText += "\r\n" + database.Name;
	document.body.innerText += "\r\nversion: " + database.Version;
	document.body.innerText += "\r\nclosed: " + database.Closed;
	document.body.innerText += "\r\nstores: " + database.StoreNames;
	document.body.innerText += "\r\n";

	doStuff();
})
.catch(defaultCatch);


let persons : Array<EZDBTypes.EZDBObjectStorable> = [
	{ id : 100, firstname : "John" , lastname : "Doe"         , age : 41, gender : "M" },
	{ id : 101, firstname : "Anne" , lastname : "Millard"     , age : 22, gender : "F" },
	{ id : 102, firstname : "Grace", lastname : "Minitz"      , age : 28, gender : "F" },
	{ id : 103, firstname : "Jean" , lastname : "Fauchelevent", age : 28, gender : "M" },
	{ id : 110, firstname : "Mary" , lastname : "Kovacs"      , age : 66, gender : "F" }
];

let emails : Array<EZDBTypes.EZDBObjectStorable> = [
	{ email : "johndoe@somewhere.com", category : "business" }
];

let preferences : Array<EZDBTypes.EZDBKeyValuePair> = [
	{key : "storeLocalData", value : true},
	{key : "autosavePreferences", value : true},
	{key : "autoplayVideos", value : false},
	{key : "signDocument", value : { value : true, signature : "basic"}}
];

let cart : Array<EZDBTypes.EZDBPlainStorable> = [
	"Robot",
	"Playing cards",
	"La Vie en Rose (album)"
];

function doStuff() {
	database.store("person").truncate();
	database.store("email").truncate();
	database.store("person_email").truncate();
	database.store("preferences").truncate();
	database.store("cart").truncate();

	let personPromise = database.store("person").insert(persons)
	.then(affected => console.log(`People inserted: ${affected}`))
	.catch(defaultCatch);
	
	let emailPromise = database.store("email").insert(emails)
	.then(affected => {
		console.log(`Email inserted: ${affected}`);
		console.log(emails);
	})
	.catch(defaultCatch);

	Promise.all([personPromise, emailPromise])
		.then(() => {
			database.store("person_email").insert([{ person_id : 100, email_key : emails[0].key }])
			.then(affected => {
				console.log(`Person-Email Relationships inserted: ${affected}`);
			})
			.catch(defaultCatch);
		});
	
	database.store("preferences").insert(preferences)
	.then(affected => {
		console.log(`Preferences inserted: ${affected}`);
	})
	.catch(defaultCatch);

	database.store("cart").insert(cart)
	.then(affected => {
		console.log(`Cart items inserted: ${affected}`);
	})
	.catch(defaultCatch);
}

