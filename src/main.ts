const ezdb : DBManager = DBManager.Instance;
ezdb.Debug = true;

let database : Database;
ezdb.open({
	database : "MyFirstDatabase",
	version : 1,
	tables : {
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
				{ name : "person_id", columns : "person_id", unique : false }
			]
		}
	}
}).then(db => {
	database = db;
	document.body.innerText = "Database has been created/opened!";
	document.body.innerText += "\r\n" + database.Name;
	document.body.innerText += "\r\nversion: " + database.Version;
	document.body.innerText += "\r\nclosed: " + database.Closed;
	document.body.innerText += "\r\ntables: " + database.TableNames;
	document.body.innerText += "\r\n";
}).catch(error => {
	document.body.innerText = error;
});