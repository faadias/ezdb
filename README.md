# ezdb.js
EZDB - Yet Another Wrapper for IndexedDB

ezdb.js is a wrapper for [IndexedDB](http://www.w3.org/TR/IndexedDB/). As the name suggests, it is supposed to make querying a lot E-Z-er.

I wrote my own wrapper for learning purposes only, but I will try and keep this project up-to-date whenever I can.

This library's look'n'feel was strongly based upon [Aaron Powell's db.js](https://github.com/aaronpowell/db.js/).

Before You Begin
================

You may test the examples below using your browser's Developer Tools. If that is Google Chrome, use the Console tab for the input and check the _Application_ tab (or _Resources_ in older versions) to monitor your database. Bear in mind, however, that some of the changes (especially those affecting the structure of a table) might only be shown after a page refresh (although closing and reopening it might also work). Some other times, refreshing the database (by right-clicking on it and choosing _Refresh IndexedDB_) might suffice.

Usage
=====

Just add a reference to ezdb.js in your application:
	
	<script src="ezdb.js"></script>
	
If IndexedDB is NOT supported by the browser, you will be informed in the console: "IndexedDB not supported!".

The next thing to do is to create a DATABASE and the TABLES (stores) within it:
	
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
	    console.log("Database has been created/opened!");
	});
	
In this example, we are creating a new database called _MyFirstDatabase_, which contains two tables (_person_ and _email_). Their _primary keys_ are the columns _id_ and _key_, respectively. Those tables also have indexes - some unique, some not - which shall be used for querying purposes later.

*Note:* Although the name given by IndexedDB is ObjectStore, I will use the term _table_ to refer to these objects.

*Note:* Just like a regular NoSQL database (like Cassandra), we do not specify all the columns in a table. That means _rows_ may vary from one another in number of attributes, even though they are in the same _table_. This will become clearer in future examples.

Since we are creating a new database from scratch, I used the number _1_ as version. Later on, I will show you how to make STRUCTURAL changes (new tables, indexes etc.) to a pre-existent database; for such a change, an increment in the version number is required in order for the changes to take effect.

The result of _ezdb.open_ is a [Promise](https://www.promisejs.org/). Since the creation/opening of a database is an asynchronous process, we have to wait for it to finish before proceeding. But how can we be sure that it has completed successfully? Since the returned object is a Promise, we just have to call its _then_ method providing a callback function. This function carries the piece of code that shall be called once the Promise is _resolved_(i.e., finishes processing). In our case, we are to save the recently created/opened database in a global variable called _database_.

*Note:* Optionally you can pass a second function as a parameter for error handling:

	...
	}).then(
		function(db) {
		    database = db;
		},
		function(error) {
		    alert(error);
		}
	);

Here is a list of other useful methods the _database_ object offers:

	database.name();				//Retrieves the database name: _MyFirstDatabase_
	database.version();				//Retrieves the database version: 1
	database.tables();				//Retrieves an array with the names of all this database's tables: ["person","email"]
	database.table("tableName");	//Retrieves a Table object for querying, inserting, removing and updating purposes (see the topics below for usage examples)
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

In the example above, we created a new _person JSON object_ with some attributes, and inserted it in the table _person_. It is important to note that since _id_ is not an auto incremental primary key, it is mandatory to inform its value.

Notice also that the attributes _birthdate_ and _hobbies_ do not have indexes attached to them. This means they will be informational columns, not searchable ones, i.e., we will not be able to look up a record by them, but they will be there all the same.

Well, sometimes we do not want to insert records one at a time. In these cases, all we have to do is provide an array of objects:

	database.table("person").insert([
		{ id : 222, firstname : "Anne" , lastname : "Millard"     , age : 22, gender : "F" },
		{ id : 121, firstname : "Grace", lastname : "Minitz"      , age : 28, gender : "F" },
		{ id : 311, firstname : "Jean" , lastname : "Fauchelevent", age : 28, gender : "M" },
		{ id : 562, firstname : "Mary" , lastname : "Kovacs"      , age : 66, gender : "F" }
	]);

*Note:* when inserting an array of objects, the insertion is executed within a transaction. This means that if ANY of the records results in an insertion error (e.g.: key duplicates), NONE of the records will be inserted. If you wish to pass by this behaviour, just insert one record at a time in a loop.

As mentioned before, IndexedDB is NoSQL and records may have a different number of attributes from each other. In the above example, I just left out the attributes _birthdate_ and _hobbies_, even though our dear _John Doe_ (inserted earlier) has them; and that is fine!

The returned value of the insert method is also a Promise. So we may call its _then_ method to make sure the record was inserted before proceeding. Calling the _then_ method is also important when you are dealing with an auto incremental primary key, as it is the case of the table _email_:

	database.table("email").insert( { email : "johndoe@somewhere.com", person_id : 111 } )
	.then(function(keys) {
		console.log(keys); //prints: [1]
		//Do something else
	});

In the above example, we are inserting a new email for John Doe, but since the table _email_ has an auto-incremental primary key, we would not know which key value was generated for this record. To find it out, we simply call the Promise's _then_ method and it will provide us an array of keys in the same order the objects were inserted. In this case, since the table was empty, the number 1 was assigned to the record.

*Note:* even though we are inserting only ONE record and not an array of _emails_, the resulting _keys_ of the _then_ method will always be an array.

## Querying

Now that we have some data in our database, how about querying it?

Differently from insertion, a query comprises many possible options, like querying by index, presenting results in descending order etc. Because of that, a query must be **built** before being executed:

	database.table("person")
		.query()
		.equals(222)
		.go()
		.then(function(results) {
			console.log(results);
		});

The first thing we do is to specify the table we are querying. When an index is not specified, the _equals_ method will look up the record by its key (222, in our example). After specifying the parameters, we just run our query by calling the _go_ method (yes, I have a Sybase user background). The returned value is, as we are already used to, a Promise. By calling its _then_ method, we have access to an array of the query's results. In the above example, what we get in the console is this array: [{ id : 222, firstname : "Anne" , lastname : "Millard", age : 22, gender : "F" }].

*Note:* even though a key is unique per record, the result of a query will always be an array.

Here is a list of possible configurations for your query, followed by a bunch of examples. Try to run some of them and see if you understand what is going on.

- desc(): Retrieves the results in descending order by key or by index, if one is specified. The default behaviour is ascending order;
- distinct(): Retrieves only the records with distinct index value, i.e., if two records have the same value in the specified index column, only the one with the lowest key is returned; if an index is not specified, "distinct" has no effect;
- first("number"): Retrieves only the first "number" records. Default is "0" for ALL records;
- index("index_name"): Makes a query by the identified "index_name" and not by the key, which is the default behaviour;
- keysonly(): Retrieves an array containing only the keys, not the entire record;
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

6. Returns an array of objects like this: { key : "primaryKey", value : "indexValue"}. Example when index is "age": { key : 222, value : 22}. Note: "keyvalue" can only be specified alongside an index.

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

12. Counts the number of records in the database where the key equals 222 and retrieves the number (being a key, of course there will be only one):

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

13. Counts the number of records in the database where age is exclusively greater than 28 and retrieves the number:

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

14. Returns all records where _firstname_ starts with an "A" or _lastname_ starts with an "M":

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

15. Same as the above example, except that only the keys are returned, not the entire record:

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

Imagine that one year has passed and Mary Kovacs is now 67 years old. How do we change the _age_ value for her in our records? The syntax resembles the one used for insertion:

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

Again, the result of the update call is a Promise, which will always return an array, either containing the affected records' keys or no records at all if any was affected. And yes, you may provide an array of objects to the update method, just like the insert case. Just remember that this will happen within a transaction and if an error is to be thrown for ANY record NONE will be updated.

Now, wait a minute, if I only want to change her age, why do I need to put all the other attributes in the JSON object? Because _update_ considers the whole thing! If you do not specify the other attributes, they will be completely erased! **Notice that they will not become _null_, they will simply disappear and becomde _undefined_ instead.**

We have learned that, when using update, it is mandatory to specify all the fields, including its primary key. So, in the case of our table _email_, you would have to query it first in order to find out the generated primary key for a given record (or just save it somewhere within the call of its _then_ method after inserting it).

In a later section, we will learn how to perform more clever updates.

**IMPORTANT:** when executing an _update_, if the record does not exist in the table, it will be **INSERTED** there. This is standard IndexedDB behaviour.

## Removing a record

Removing a record is just as easy as inserting or updating. The only difference is that we only need to inform the keys of the records we wish to remove from the table (not the whole object). Say goodbye to Jean, because he is moving back to France:

	database.table("person")
		.remove(311)				//311 is Jean Fauchelevent's id
		.then(function(keys) {
			console.log(keys);
		});

As usual, the result of the remove call is also a Promise, by which we can access the removed keys.

Just like _insert_ and _update_, _remove_ accepts an array of keys to be removed. Just remember that this will happen within a transaction, so if an error is to be thrown for ANY record, NONE will be removed.

## Advanced updates

OK, imagine a scenario where I do not have all the information about a record, I only know WHAT has to be changed and in WHICH circumstances. In our previous update example, I said that a year had passed, but why only Mary Kovacs got older? Everybody's age should have been incremented by one, right? This is how we do it:

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

As you might be getting tired already, yes, the returned value of this update call is also a Promise, which will come up with an array of the affected keys.

Now, let us break down the code into pieces for a better understanding, shall we?

First, we call the table's update method just like before, except that this time it does not have any parameters. Then, we specify what we want to _set_ (in our example, it is the attribute _age_). We could have used a fixed number, but then everybody would have been updated to the same age. No, what we wanted was to increase the person's previous age by one, so we provide a function that will have access to all of the record's attributes and will decide which changes should be made. Notice that the access to the attributes is made by a _getter_ function, so that the actual object is not exposed. You can call _getter_ upon any of the record's attribute.

After specifying what we want to _set_, our _update_ is configured and can be executed. To do that, we just call its _go_ method, just like we did with queries.

This kind of update can also be used alongside indexes and bounding, using the same syntax shown for queries:

1. Sets everybody who is 28 years old to an age of 56 and a male gender:

	```javascript
	database.table("person")
		.update()
		.index("age")
		.equals(29)
		.set({age : 56, gender : "M"})
		.go()
		.then(function(keys) {
			console.log(keys); //prints an array of the affected records' keys
		});
	```
2. You can also ERASE an attribute (instead of setting it to null). In the following example, we remove the _gender_ attribute for everyone who is at most 24 years old (exclusively):

	```javascript
	database.table("person")
		.update()
		.index("age")
		.upperBound(24, true)
		.del("gender")
		.go()
		.then(function(keys) {
			console.log(keys); //prints an array of the affected records' keys
		});
	```

3. When removing an attribute, you can provide a function that returns a boolean and decides whether the attribute should be erased or not. Or you could specify that an attribute should be removed for everybody:

	```javascript
	database.table("person")
		.update()
		.del({
			gender : true,								//Removes the attribute _gender_ for everybody
			age : function(getter) {
				return getter("firstname") === "Mary";	//Removes the attribute _age_ for those whose first name is Mary
			}
		})
		.go()
		.then(function(keys) {
			console.log(keys); //prints an array of the affected records' keys
		});
	```

4. The _del_ method also accepts an array of attributes that should be erased:
*Note:* the _affected keys_ array returned in the Promise will contain ALL the keys, even those whose corresponding records were missing the removed attribute. This is because the entire table is traversed when an index or bounding is not specified.

	```javascript
	database.table("person")
		.update()
		.del(["hobbies","birthdate"])
		.go()
	```

## Advanced removal

Very similar to advanced updating and querying. I believe that at this point you will be able to figure out by yourself what the code below does:

	database.table("person")
		.remove()
		.index("age")
	    .equals(56)
		.filter(function(getter){
			return getter("firstname") === "Grace";
		})
		.go()
		.then(function(results) {
			console.log(results);	// [ { key : 56, primaryKey : 121 } ];
						// key corresponds to the value of the index (age) for the removed record
						// primaryKey is, of course, the removed record's primary key value
		});

If you say that this will only remove those records where age is 56 and first name is "Grace", then you guessed it right!

The only important note here is that the _results_ returned by the Promise is a bit different from previous sections: it consists of a list of objects with the attributes _key_ and _primaryKey_. If an index is specified, _key_ will hold the value of the index for that record; if not, it will be the same as _primaryKey_.

## Transactions

I will not go into details about transactions. If you are used to databases, you know how they work. Put simply, a transaction is a group of commands guaranteed to be ENTIRELY persisted in the database or NOT AT ALL: they either succeed together or fail together.

This is exactly what happens, as mentioned earlier, when you provide an array to the insert, update or remove methods. The difference here is that you can now combine those calls and use different tables:

	database.transaction()
		.insert("person", [
			{ id : 900, firstname : "Benjamin", lastname : "Simpson", age : 40, gender : "M"},
			{ id : 901, firstname : "Alice"   , lastname : "Simpson", age : 38, gender : "F"}
		])
		.update("person", { id : 121, firstname : "Grace", lastname : "Minitz" , age : 28, gender : "F" }) //Grace was removed in our "advanced removal" section... this update will recreate her in the table
		.remove("person", 562) //removes the record with key 562 (Mary Kovacs)
		.insert("email", [
			{ email : "ben.simpsone@domain.com", person_id : 900 },
			{ email : "alice.simpsone@domain.com", person_id : 901 }
		])
		.commit()
		.then(function(output) {
			console.log(output);
		});

The _output_ within the _then_ method is an object containing the names of the tables that suffered some kind of change along with the keys of the modified objects. In the case of the example above, the output will be as follows:

	{
		person: {
			insert : [900,901],
			update : [121],
			remove : [562]
		},
		email: {
			insert : [2,3],
			update : [],
			remove : []
		}
	}

## Truncating a table

In order to truncate a table and clear all of its records, just call:

	database.table("person").truncate();

This makes me realize that, generally, the simplest of commands is also the most damaging one...

Anyway, the Promise resulting from this operation will retrieve the Table _person_, so you may continue to make operations upon it, but now being sure that the table is empty.

## Waiting for parallel Promises to finish

As mentioned earlier, you can insert, update or remove records within a for loop to avoid the transactional behaviour. But what if we need to WAIT until all the operations have finished before proceeding? All you have to do is use the _ezdb.wait_ method. Let us write an example with a loop:

	var people = [
		{ id : 45, firstname : "Joanne" , lastname : "Pope"     , age : 72, gender : "F" },
		{ id : 46, firstname : "Frank"  , lastname : "Schwartz" , age : 51, gender : "M" },
		{ id : 47, firstname : "Jack"   , lastname : "Mills"    , age : 33, gender : "M" }
	];
	
	var keyForRemoval = 222;
	
	var promises = [];
	
	for (var i=0; i < people.length; ++i) {
		promises.push(database.table("person").insert(people[i]));
	}
	
	promises.push(database.table("person").remove(keyForRemoval));
	
	ezdb.wait(promises).then(function(output) {
		console.log(output);
		//Do whatever you need now that all operations have finished.
	});
	
The _output_ in the _then_ method is an array containing the outputs of every transaction.

Remember that some operations may fail, some not, but the ones that succeed will be persisted in the database regardless of the ones that have gone wrong.

*Note:* You may provide a second function to _then_ for error handling.

## Updating you database structure

Suppose we need to change our database's structure: create new tables, drop old ones, add new indexes, remove old ones etc. To do this, we just have to increase the version number when opening the database and write down the differences:

	var database = null;
	ezdb.open({
	    database : "MyFirstDatabase",
	    version : 2,	//New version here!
	    tables : {
	        person : {
	            indexes : [
	                { name : "firstnameage", columns : ["firstname","age"], unique : false }
	            ],
	            delindexes : [
	                "age"
	            ]
	        },
	        email : {
	            drop : true
	        }
	    }
	}).then(function(db) {
	    database = db;
	});

As you can see, updating a database is **incremental**: you do not have to repeat the old structure, just inform the changes. Do not worry if you do specify some part of the old structure again because they will just be ignored.

In our example, we created a new index for table _person_, removed its index called _age_ and dropped the table _email_. These, I believe, are all the changes that can be made. Of course, if you need a new table, just add it there.

## Final thoughts

There are other libraries out there that will handle the job, possibly much better than this one. As I said, I only wrote this code for a better understanding of how IndexedDB and Promises work (and also because I am too lazy to try and understand everyone else's code).

If you decide to use it, please report any bugs you may find so they can be properly fixed, ok?

Have fun!
