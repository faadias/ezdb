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
	database.drop();				//Drops the entire database; this is only possible if the database is closed. Example: database.close().drop().

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
		hobbies : ["frisbees","dogs","computing","reading"]
	};
	database.table("person").insert(person);

In the example above, we created a new person JSON object with some attributes, and inserted it in the table "person". It is important to note that since "id" is a non-autoincremental primary key, it is mandatory to inform its value.

Notice also that the attributes "birthdate" and "hobbies" do not have indexes attached to them. This means they will be informational columns, not searchable ones, i.e., we will not be able to look up a record by them, but they will be there all the same.

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

Now that we have some data in our database, how about querying it?

Differently from insertion, a query comprises many possible options, like querying by index, present results in descending order etc. Because of that, it must be built before being executed:

	database.table("person")
		.query()
		.equals(222)
		.go()
		.then(function(results) {
			console.log(results);
		});

The first thing we do is specify the table we are querying. When an index is not specified, the "equals" method will look up the record by its key (222, in our example). After specifying the parameters, we just run our query by calling the "go" method (yes, I am a Sybase user). The returned value is, as we are already used to, is a Promise. By calling its "then" method, we have access to an array of the query's results. In the above example, that is what we will get on the console: [{ id : 222, firstname : "Anne" , lastname : "Millard", age : 22, gender : "F" }].

Note: even though a key is unique per record, the result of a query will always bring an array.

Here is a list of possible configurations for your query, followed by a bunch of examples. Try to run some of them and see if you understand what is going on.

- desc(): Retrieves the results in descendind order by key or by index, if one is specified. The default behaviour is asceding order;
- distinct(): Retrieves only the records with distinct index value, i.e., if two records have the same value in the specified index column, only the one with the lowest key is returned; if an index is not specified, "distinct" has no effect;
- first("number"): Retrieves only the first "number" records. Deafult is "0" for ALL records;
- index("index_name"): Makes a query by the identified "index_name" and not by the key, which is the default behaviour;
- keysonly(): Retrieves an array containg only the recods keys, not the entire record;
- keyvalue(): Retrieves an array of the type key-value, where "key" is the primary key of the record and "value" is the value of the specified index column. For example, if "age" is specified as the query index, the returned object for "Anne" (see insertions above) is { key : 222, value : 22 }, since its age is 22.
Note: "keyvalue" can only be used alongside an index.
- count(): Retrieves the number of records in the database. "count" can only go alone or alongside index and/or bounding options.
- filter("function"): Specifies a function to be used when retrieving values. Only the records for which "function" returns "true" will be considered. Within "function", you will have access to the record's json object (see examples below);
- equals("value"): Retrieves only the results where the key (or the index, if specified) is equals to "value".
- upperbound("bound", ["is_strict"]): Creates an upper bound of value "bound", meaning that only the records with a key (or an index, if specified) smaller or equal to "bound" will be retrieved. If the optional parameter "is_strict" is specified as "true", then only the records strictly smaller will be retrieved;
- lowerbound("bound", ["is_strict"]): Creates a lower bound of value "bound", meaning that only the records with a key (or an index, if specified) greater or equal to "bound" will be retrieved. If the optional parameter "is_strict" is specified as "true", then only the records strictly greater will be retrieved.

Examples:

1. All records where age == 28 (results in ascending order as default):

	```javascript
	database.table("person")
		.query()
		.index("age")
		.equals(28)
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

2. All records in descending order by age:

	```javascript
	database.table("person")
		.query()
		.index("age")
	    .desc()
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

3. Unique records by age (when there is more than one record with the same age, only the one with the lowest key value is returned):

	```javascript
	database.table("person")
		.query()
		.index("age")
	    .distinct()
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

4. Order the records in descending order by age and retrieve only the first two records:

	```javascript
	database.table("person")
		.query()
		.index("age")
	    .desc()
		.first(2)
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

5. Returns an array containg only the keys of all the records:

	```javascript
	database.table("person")
		.query()
	    .keysonly()
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

6. Returns an array of objects like this: { key : "primaryKey", value : "indexValue"}. Example when index is "age: { key : 222, value : 22}:
Note: "keyvalue" can only be specified alongside an index.

	```javascript
	database.table("person")
		.query()
		.index("age")
	    .keyvalue()
		.go()
		.then(function(results) {
			console.log(results);
		});
	```
	
7. All records where age is less or equal to 36:

	```javascript
	database.table("person")
		.query()
		.index("age")
		.upperBound(36)
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

8. All records where age is less than 36:

	```javascript
	database.table("person")
		.query()
		.index("age")
		.upperBound(36, true)
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

9. Returns only the keys, in descending order by age, of all the records with age less than 36:

	```javascript
	database.table("person")
		.query()
		.index("age")
		.upperBound(36, true)
	    .keysonly()
	    .desc()
		.go()
		.then(function(results) {
			console.log(results);
		});
	```
10. Returns only the records where age is greater or equal to 22 and strictly less than 36:

	```javascript
	database.table("person")
		.query()
		.index("age")
		.lowerBound(22)
		.upperBound(36, true)
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

11. Counts the number of records in the database and retrieves the number:

	```javascript
	database.table("person")
		.query()
		.count()
		.go()
		.then(function(count) {
			console.log(count);
		});
	```

12. Counts the number of records in the database where the key equals 222 and retrieves the number:

	```javascript
	database.table("person")
		.query()
		.equals(222)
		.count()
		.go()
		.then(function(count) {
			console.log(count);
		});
	```

13. Counts the number of records in the database where age is exclusively grater than 28 and retrieves the number:

	```javascript
	database.table("person")
		.query()
		.index("age")
		.lowerBound(28, true)
		.count()
		.go()
		.then(function(count) {
			console.log(count);
		});
	```

14. Returns all records where "firstname" starts with "A" or "lastname" starts with "M":

	```javascript
	database.table("person")
		.query()
		.filter(function filter(data) {
			return data.firstname[0] === "A" || data.lastname[0] === "M";
		})
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

15. The same as the above example, except that only the keys are returned, not the entire record:

	```javascript
	database.table("person")
		.query()
		.keysonly()
		.filter(function filter(data) {
			return data.firstname[0] === "A" || data.lastname[0] === "M";
		})
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

## Updating a record

Imagine taht one year has passed and Mary Kovacs is now 67 years old. How do we change tha "age" value for her in our records? The syntax resembles the one used for insertion:

	database.table("person")
		.update({
			id : 562,
			firstname : "Mary",
			lastname : "Kovacs",
			age : 67,			//This value will be changed to 67
			gender : "F"
		}).then(function(keys){
			console.log(keys)
		});

Again, the result of the update call is a Promise, which will always return an array with the affected keys. And yes, you can pass an array of objects to the update method, just like in insert. Just remember that this will happen within a transaction, if an error is to be thrown for ANY record, NONE will be updated.

Now, wait a minute, if I only want to change her age, why do I need to put all the other attributes in the JSON object? Because "update" considers the whole thing! If you do not specify the other attributes, they will be completely erased! Notice that they will not become "null", they will just disappear.

We have learned that, ehen using update, it is mandatory to specify all the fields, including its primary key. So, in the case of our table "email", you would have to query it first in order to find out the generated primary key for a given record (or just save it somewhere in the "then" method after inserting it).

In a later section, we will learn how to perform more clever updates.

## Deleting a record

Deleting a record is just as easy as inserting or updating. The only difference is that we only need to pass the keys we want removed from the table and not the whole object. Say goodbye to Jean, because he is moving back to France:

	database.table("person")
		.delete(311)				//311 is Jean Fauchelevent's id
		.then(function(keys) {
			console.log(keys);
		});

As usual, the result of the delete call is also a Promise with an array of the deleted keys.

Just like insert and update, the delete method will accept an array of keys to be deleted. Just remember that this will happen within a transaction, if an error is to be thrown for ANY record, NONE will be removed.

## Advanced updates

OK, imagine a scenario where I do not have all the information about a record, I only know WHAT has to be changed and in WHICH circumstances. In our previou update example, I said that a year had passed, but why only Mary Kovacs got older? Everybody's age should have been incremented by one, right? This is how we do it:

	database.table("person")
		.update()
		.set({
            age : function(getter) {
			    return getter("age") + 1;
            }
		})
		.go()
		.then(function(results) {
			console.log(results);
		});

As you might be getting tired already, yes, the returned value of this update call is also a Promise, which will bring up an array of the affected keys.

Now, let us break down the code into pieces for a better understading, shall we?

First, we call the table's update method just like before, except that this time it does not have any parameters. Then, we specify what we want to "set" (in our example, it is the attribute "age"). We could have used a fixed number, but then everybody would have been updated to the same age. No, what we wanted was to increase the person's previous age by one, so we pass a function that will have access to all of the record's attributes and will decide which changes should be made. Notice that the access to the attributes is made by a "getter" function, so that the actual object is not exposed. You cal call "getter" with any of the records attribute.

After specifying what we want to "set", our "update" is configured and can be executed. To do that, we just call its "go" method, just like we did with queries.

This kind of update can also be used alongside indexes and boundings. You can use the same syntax used for queries, as shown below:

1. Sets everybody who is 28 years to an age of 56 and a masculine gender:

	```javascript
	database.table("person")
		.update()
		.index("age")
	    .equals(28)
		.set({age : 56, gender : "M"})
		.go()
		.then(function(keys) {
			console.log(keys); //logs an array of the affected records' keys
		});
	```
2. You can also ERASE an attribute (instead of setting it to null). In the following example, we remove the "gender" attribute for everyone who is at most 24 years old (exclusively):

	```javascript
	database.table("person")
		.update()
		.index("age")
	    .upperBound(24, true)
		.del("gender")
		.go()
	```

3. When removing an attribute, you can pass a function that returns a boolean and decides whether the attribute should be erased or not. Or you could specify the an attribute should be removed for everybody:

	```javascript
	database.table("person")
		.update()
		.del({
			gender : true,								//Removes the attribute "gender" for everybody
			age : function(getter) {
				return getter("firstname") === "Mary";	//Removes the attribute "age" for those whose first name is Mary
			}
		})
		.go()
	```

4. The "del" method also accpets an array of attributes that should be erased:
Note: the returned keys array in the Promise will contain all the keys, even those whose records did not have the removed attribute. This is because the entire table is traversed if an index or boundings are not specified.

	```javascript
	database.table("person")
		.update()
		.del(["hobbies","birthdate"])
		.go()
	```

## Advanced deletes

Very similitar to advanced updating and querying, I believe that at this point you will be able to figure out what the code below does:

	database.table("person")
		.delete()
		.index("age")
	    .equals(29)
		.filter(function(getter){
			return getter("firstname") === "Grace";
		})
		.go()
		.then(function(results) {
			console.log(results);
		});

If you think that this will only remove those records where age is 29 and first name is "Grace", then you guessed it right!

The only important note here is that, differently from other Promises, this one will not return the records primary key only, but the whole record itself!

## Transactions
//TODO

## Truncating a table

In order to truncate a table and clear all of its records, just call:

	database.table("person").truncate()

This makes me realize that, generally, the simplest of commands is also the most damaging one...

## Updating you database structure
//TODO
