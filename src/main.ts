(function() {
	const ezdb : DBManager = DBManager.Instance;
	const defaultCatch = (error : string) => document.body.innerText = error;

	this.ezdb = ezdb;
	this.defaultCatch = defaultCatch;

	let database : Database;

	ezdb.open("MyFirstDatabase", 1, {
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
	})
	.then(db => {
		database = db;
		document.body.innerText = "Database has been created/opened!";
		document.body.innerText += "\r\n" + database.Name;
		document.body.innerText += "\r\nversion: " + database.Version;
		document.body.innerText += "\r\nclosed: " + database.Closed;
		document.body.innerText += "\r\ntables: " + database.TableNames;
		document.body.innerText += "\r\n";

		doStuff();
	})
	.catch(defaultCatch);


	let persons = [
		{ id : 101, firstname : "Anne" , lastname : "Millard"     , age : 22, gender : "F" },
		{ id : 102, firstname : "Grace", lastname : "Minitz"      , age : 28, gender : "F" },
		{ id : 103, firstname : "Jean" , lastname : "Fauchelevent", age : 28, gender : "M" },
		{ id : 110, firstname : "Mary" , lastname : "Kovacs"      , age : 66, gender : "F" }
	];

	let emails = [
		{ email : "johndoe@somewhere.com", person_id : 111 }
	];

	function doStuff() {
		database.table("person").truncate();
		database.table("email").truncate();

		database.table("person").insert(persons)
		.then(affected => console.log(affected))
		.catch(defaultCatch);
		
		database.table("email").insert(emails)
		.then(affected => {
			console.log(affected);
			console.log(emails);
		})
		.catch(defaultCatch);
	}
}).call(window);
