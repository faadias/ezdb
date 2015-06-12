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
	                { name : "person_id", columns : "person_id", unique : true }
	            ]
	        }
	    }
	}).then(function(db) {
	    database = db;
	});

In this example, we are creating a new database called "MyFirstDatabase" containg two tables named "person" and "email". Their "primary keys" are the columns "id" and "key", respectively. Those tables also have indexes, some unique, some not, which will be used for querying purposes.

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


## Inserting a new record
TODO
## Querying
TODO
## Updating a record
TODO
## Deleting a record
TODO
