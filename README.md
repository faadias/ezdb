# ezdb.js
EZDB - Yet Another Wrapper for IndexedDB

ezdb.js is a wrapper for [IndexedDB](http://www.w3.org/TR/IndexedDB/). As the name suggests, it is supposed to make querying a lot E-Z-er (easier) to work with.

I wrote my own wrapper for learning purposes only, but I will try and keep this project up-to-date whenever I can.

This library's look'n'feel was strongly based upon [Aaron Powell's db.js](https://github.com/aaronpowell/db.js/).

Usage
=====

Just add a reference to ezdb.js in your application:

	<script src="ezdb.js"></script>

If IndexedDB is NOT supported by the browser, you'll be informed on the console: "IndexedDB not supported!".

Now, the next thing to do is create you DATABASE and the TABLES (stores) within it:

	var database = null;
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
	}).then(function(db) {
	    database = db;
	});

In this example, we are creating a new database called "MyFirstDatabase" containing two tables named "person" and "email". Their "primary keys" are the columns "id" and "key", respectively. Those tables also have indexes, some unique, some not, which will be used for querying purposes.

Note: Just like a regular NoSQL database (like Cassandra), we do not specify all the columns in a table. This means that a "row" may vary from another in the number of attributes, even though they are in the same table. This will become more clear in future examples.

Since we are creating a new database from scratch, I used the number "1" as its version. Later on, I will show you how to make STRUCTURAL changes (new tables, indexes etc) to a pre-existent database, which will require an increment in the version number in order for the changes to take effect. 

The result of "ezdb.open" is a [Promise](https://www.promisejs.org/). Since the creation/opening of a database is an asynchronous process, we have to wait for it to finish before proceeding. But how can we be sure that it has completed succesfully? Simple! Since the returned object is a Promise, we just have to call its "then" method and tell it what needs to be done when the Promise is "resolved", i.e., finishes processing. In our case, we are to save the recently created/opened database in a global variable called "database".

Note: Optionally, you can pass a second function as a parameter of "then" for error handling:

	...
	}).then(
		function(db) {
		    database = db;
		},
		function(error) {
		    alert(error);
		}
	);

Here is a list of other useful methods of the database object:

	database.name();				//Retrieves the database name: "MyFirstDatabase"
	database.version();				//Retrieves the database version: 1
	database.tables();				//Retrieves an array with the names of all this database's tables: ["person","email"]
	database.table("tableName");	//Retrieves a Table object for querying, inserting, deleting and updating purposes (see the topics below for usage examples)
	database.close();				//Immediately closes this database, allowing you to update or drop it; while closed, it is not possible to use the database for querying etc
	database.isClosed();			//Tells whether this database is closed or not; another way to test this is by calling 'ezdb.isClosed("databaseName")'
	database.drop();				//Drops the entire database; this is only possible if the database is closed
	

OK, now that we know how to handle our database, how about inserting some data into our tables?

## Inserting

To insert a new record, all we need is a JSON object, like this:

	var person = {
		id : 111,
		firstname : "John",
		lastname : "Doe",
		age : 36,
		gender : "M",
		birthdate : new Date("Nov 22 1985"),
		hobbies : ["frisbees","dogs", "computing", "reading"]
	};
	database.table("person").insert(person);

In the example above, we created a new person JSON object with some attributes, and inserted it in the table "person". It is important to note that since "id" is a non-autoincremental primary key, it is mandatory to inform its value.

Notice also that the attributes "bithdate" and "hobbies" do not have indexes attached to them. This means they will be informational columns, not searchable ones, i.e., we will not be able to look up record by them, but they will be there.

Well, sometimes we do not want to insert records one at a time. In these cases, all we have to do is provide an array of objects:

	database.table("person").insert([
		{ id : 222, firstname : "Anne" , lastname : "Millard"     , age : 22, gender : "F" },
		{ id : 121, firstname : "Grace", lastname : "Minitz"      , age : 28, gender : "F" },
		{ id : 311, firstname : "Jean" , lastname : "Fauchelevent", age : 28, gender : "M" },
		{ id : 562, firstname : "Mary" , lastname : "Kovacs"      , age : 66, gender : "F" }
	]);

Note: when inserting an array of objects, the insertion is executed within a transaction. This means that if ANY of the records results in an insertion error (e.g.: key duplicates), NONE of the records will be inserted. If you wish to pass by this behaviour, just insert one record at a time in a loop.

As mentioned before, IndexedDB is NoSQL and records may have a different number of attributes from each other. In the above example, I just left out the attributes "birthdate" and "hobbies", even though our dear "John Doe" (inserted earlier) has them, and that is completely alright!

The returned value of the insert method is also a Promise and so we may call its "then" method to make sure the record was inserted before proceeding. Calling the "then" method is also important when you are dealing with an auto-incremetal primary key, as it is the case of the table "email":

	database.table("email").insert( { email : "johndoe@somewhere.com", person_id : 111 } )
	.then(function(keys) {
		console.log(keys); //It will log this array to the console: [1]
		//Do something else
	});

In the above example, we are inserting a new email for John Doe, but since the table "email" has an auto-incremental primary key, we would not know which key value was generated for this record. To find it out, we just have to call the Proimise's "then" method and it will provide us an array of keys in the same order the objects were inserted. In this case, since the table was empty, the number 1 was assigned to the record.

Note: even though we are inserting only ONE record and not an array of "emails", the resulting "keys" of the "then" method will always be an array.

## Querying
TODO
## Updating a record
TODO
## Deleting a record
TODO
