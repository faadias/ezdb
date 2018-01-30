# ezdb.js
EZDB - Yet another wrapper for IndexedDB

ezdb is a wrapper for [IndexedDB](http://www.w3.org/TR/IndexedDB/). As the name suggests, it is supposed to make querying a lot E-Z-er.

I wrote my own wrapper for learning purposes only, but I will try and keep this project up-to-date whenever I can.

This library's look'n'feel was strongly based upon [Aaron Powell's db.js](https://github.com/aaronpowell/db.js/).

---
## Usage

If you want to use ezdb in a web application, simply download ezdb.js from the build directory and add a reference to it in your html page:

```html
<script src="ezdb.js"></script>
```

But before trying to use it, it's important to check if IndexedDB is supported by the browser:

```javascript
if (ezdb.Loaded) {
	//Your code here
}
else {
	alert("IndexedDB not supported by this browser!");
}
```

If, on the other hand, you want to clone the project and compile it yourself, follow these steps:

1. Have Git installed in your machine;
2. Have Node.js installed in your machine;
3. Make sure Node.js root folder is correctly set in your system or local PATH variable;
4. Run the following commands:
```bash
# Clone this repository
$ git clone https://github.com/faadias/ezdb.git

# Navigate to the recently cloned project directory
$ cd ezdb

# Install dependecies (webpack, typescript and ts-loader)
$ npm run install

# Build the project
$ npm run build
```

---
## First Example

You may test the example below using your browser's Developer Tools. If that is Google Chrome, input the specified commands in the Console tab and check the Application tab (or Resources in older versions) for the results. Bear in mind, however, that some of the changes (especially those affecting the database's structure) might only be shown after a page refresh or by closing and reopening the page. Some other times, refreshing the database (by right-clicking on it and choosing Refresh IndexedDB) might suffice.

So first we create a basic html page (index.html) and import ezdb.js. Here is a sample for you, supposing the files index.html and ezdb.js are in the same folder:

```html
<!doctype html>
<html>
<head>
	<meta charset=utf-8>
	<script src="ezdb.js"></script>
	<title>EZDB Test</title>
</head>
<body></body>
</html>
```

The next thing to do is to open index.html in a web browser. I recommend using Google Chrome.

Now open your browser's Dev Tools and copy and paste the following command on the Console tab:

```javascript
let database;

ezdb.open("MyFirstDatabase", 1, {
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
	console.log("Database has been created/opened!");
});
```

Now you can check the result in the Application tab.

In this example, we are created a new database called *MyFirstDatabase*, which contains five stores:

- person
- email
- person_email
- preferences
- cart

*Note:* if you come from a relational database background, *stores* are pretty much like *tables*.

The *primary keys* of the first three stores have been named, respectively, **id**, **key** and **[person_id, email_key]**. Because of that, I shall refer to them as *Keypath Stores*. For *preferences* and *cart*, no key names have been specified, and I shall refer to them as *Simple Stores*; apart from that, they have a *primary key* all the same: when not specified, a *primary key *with the default name of **key** is generated.

As you can see, indexes have been specified for *person* and *email*. This is an advantage of *keypath stores* (those for which a keyPath was given) over *simple stores*: they can have indexes. Those fellas are powerfull for they may garantee uniqueness (by setting the flag *unique : true*) or for advanced querying purposes (as we shall see later).

*Note:* Although the name given by IndexedDB to these objects is *ObjectStore*, I will just use the term *store* to refer to them.

*Note:* Just like a regular NoSQL database (like Cassandra), we do not specify all the *attributes* (*columns*) in a store. That means *rows* may vary from one another in number of *attributes*, even though they are in the same *store*. This will become clearer in future examples.

Since we are creating a new database from scratch, I used 1 as its version. Later on, I will show you how to make STRUCTURAL changes (new stores, indexes etc.) to a pre-existent database; for such a change to take place, an increment in the version number is required.

The result of *ezdb.open* is a [Promise](https://www.promisejs.org/). Since the creation/opening of a database is an asynchronous process, we have to wait for it to finish before proceeding. But how can we be sure that it has completed successfully? Since the returned object is a Promise, we just have to call its *then* method providing a callback function. This function carries the piece of code that shall be called once the Promise is *resolved* (i.e., finishes processing). In our case, we are to save the recently created/opened database in a global variable called *database*.

*Note:* Optionally you may call *catch* after *then* for error handling:

```javascript
ezdb.open({
	//stores' definitions
})
.then(db => database = db)
.catch(error => alert(error));
```

Here is a list of useful getter and methods offered by the *database* object:

```javascript
//Retrieves the database name: "MyFirstDatabase"
database.Name;

//Retrieves the database version: 1
database.Version;

//Retrieves an array containing names of all of this database's stores: ["person","email","person_email","preferences","cart"]
database.Stores;

//Retrieves a store object for querying, inserting, removing and updating purposes (see the topics below for examples on how to do it)
database.store("storeName");

//Immediately closes this database, allowing you to update its structure or drop it; while closed, it is not possible to use the database for querying etc
database.close();

//Tells whether this database is closed or not; another way to test this is by calling ezdb.isClosed(<database_name>)
database.Closed;
ezdb.isClosed("MyFirstDatabase")

//Drops the entire database; this is only possible if the database is closed
database.drop(); //Usually, the call will be database.close().drop();
```

OK, now that we know how to handle our database, how about inserting some data into our stores?

### Inserting

To insert a new record, all we need is a JSON object, like this:

```javascript
let person = {
	id : 111,
	firstname : "John",
	lastname : "Doe",
	age : 36,
	gender : "M",
	birthdate : new Date("Nov 22 1985"),
	hobbies : ["frisbees","dogs","computing","reading"]
};
database.store("person").insert([person]);
//Note: "database" is the variable we set when we opened the database
```

In the example above, we created a new *person JSON object* with some attributes, and inserted it in the store *person*. It is important to note that since *id* is not an auto incremental primary key, it is mandatory to inform its value.

Notice also that the attributes *birthdate* and *hobbies* do not have indexes attached to them. This means they will be purely informational, because we will not be able to look up a record by them.

Since the argument for *insert* is an array, it is simple to insert more than one record at once.:

```javascript
database
	.store("person")
	.insert(
		[
			{
				id : 222,
				firstname : "Anne",
				lastname : "Millard",
				age : 22,
				gender : "F"
			},
			{
				id : 121,
				firstname : "Grace",
				lastname : "Minitz",
				age : 28,
				gender : "F"
			},
			{
				id : 311,
				firstname : "Jean",
				lastname : "Fauchelevent",
				age : 28,
				gender : "M"
			},
			{
				id : 562,
				firstname : "Mary",
				lastname : "Kovacs",
				age : 66,
				gender : "F"
			}
		]
	);
```

*Note:* when inserting an array of objects, the insertion is executed within a transaction. This means that if ANY of the records results in an insertion error (e.g.: key duplicates), NONE of the records will be inserted. If you wish to bypass this behaviour, just insert one record at a time in a loop.

As mentioned before, IndexedDB is NoSQL and records may have a different number of attributes from each other. In the above example, I just left out the attributes *birthdate* and *hobbies*, even though our dear *John Doe* (inserted earlier) has them.

The returned value of the insert method is also a Promise. So we may call its *then* method to make sure the record was inserted before proceeding.

When inserting objects into an *auto-incremental-key store*, such as *email*, an attribute with the key name and its value will be added to the object, so you will which value was generated for it:

```javascript
let email = {
	email : "johndoe@somewhere.com",
	category : "personal"
};

database
	.store("email")
	.insert(email)
	.then(() => {
		console.log(email); //{key : 1, email : "johndoe@somewhere.com", category : "personal"}
	});
```

In the above example, we are inserting a new email, but since the store *email* has an auto-incremental primary key, we would not know which key value was generated for it. But ezdb, being kind and good as only it can be, sets the key value for you in the orginal object. Note that if the key was called, for example, *id*, it would be this attribute (and not *key*) that would be added to the object.

*Note:* Here is another advantage of *named-key stores* over *non-named-key stores*: when the key is autoincremental, we may retrieve the generated value by looking for it within the the object that was just inserted. Keys generated for *non-named-key stores* cannot be retrieved.

### Querying

Now that we have some data in our database, how about querying it?

Differently from insertion, a query comprises many possible options, like querying by index, presenting results in descending order etc. Because of that, a query must be **built** before being executed:

	database.store("person")
		.query()
		.equals(222)
		.go()
		.then(function(results) {
			console.log(results);
		});

The first thing we do is to specify the store we are querying. When an index is not specified, the *equals* method will look up the record by its key (222, in our example). After specifying the parameters, we just run our query by calling the *go* method (yes, I have a Sybase user background). The returned value is, as we are already used to, a Promise. By calling its *then* method, we have access to an array of the query's results. In the above example, what we get in the console is this array: [{ id : 222, firstname : "Anne" , lastname : "Millard", age : 22, gender : "F" }].

*Note:* even though a key is unique per record, the result of a query will always be an array.

Here is a list of possible configurations for your query, followed by a bunch of examples. Try to run some of them and see if you understand what is going on.

- desc(): Retrieves the results in descending order by key or by index, if one is specified. The default behaviour is ascending order;
- distinct(): Retrieves only the records with distinct index value, i.e., if two records have the same value in the specified index column, only the one with the lowest key is returned; if an index is not specified, "distinct" has no effect;
- first("number"): Retrieves only the first "number" records. Default is "0" for ALL records;
- index("index*name"): Makes a query by the identified "index*name" and not by the key, which is the default behaviour;
- keysonly(): Retrieves an array containing only the keys, not the entire record;
- keyvalue(): Retrieves an array of the type key-value, where "key" is the primary key of the record and "value" is the value of the specified index column. For example, if "age" is specified as the query index, the returned object for "Anne" (see insertions above) is { key : 222, value : 22 }, since its age is 22.
Note: "keyvalue" can only be used alongside an index.
- count(): Retrieves the number of records in the database. "count" can only go alone or alongside index and/or bounding options.
- filter("function"): Specifies a function to be used when retrieving values. Only the records for which "function" returns "true" will be considered. Within "function", you will have access to the record's json object (see examples below);
- equals("value"): Retrieves only the results where the key (or the index, if specified) is equals to "value".
- upperbound("bound", ["is*strict"]): Creates an upper bound of value "bound", meaning that only the records with a key (or an index, if specified) smaller or equal to "bound" will be retrieved. If the optional parameter "is*strict" is specified as "true", then only the records strictly smaller will be retrieved;
- lowerbound("bound", ["is*strict"]): Creates a lower bound of value "bound", meaning that only the records with a key (or an index, if specified) greater or equal to "bound" will be retrieved. If the optional parameter "is*strict" is specified as "true", then only the records strictly greater will be retrieved.

Examples:

1. All records where age == 28 (results in ascending order as default):

	```javascript
	database.store("person")
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
	database.store("person")
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
	database.store("person")
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
	database.store("person")
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
	database.store("person")
		.query()
	    .keysonly()
		.go()
		.then(function(results) {
			console.log(results);
		});
	```

6. Returns an array of objects like this: { key : "primaryKey", value : "indexValue"}. Example when index is "age": { key : 222, value : 22}. Note: "keyvalue" can only be specified alongside an index.

	```javascript
	database.store("person")
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
	database.store("person")
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
	database.store("person")
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
	database.store("person")
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
	database.store("person")
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
	database.store("person")
		.query()
		.count()
		.go()
		.then(function(count) {
			console.log(count);
		});
	```

12. Counts the number of records in the database where the key equals 222 and retrieves the number (being a key, of course there will be only one):

	```javascript
	database.store("person")
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
	database.store("person")
		.query()
		.index("age")
		.lowerBound(28, true)
		.count()
		.go()
		.then(function(count) {
			console.log(count);
		});
	```

14. Returns all records where *firstname* starts with an "A" or *lastname* starts with an "M":

	```javascript
	database.store("person")
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
	database.store("person")
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

### Updating a record

Imagine that one year has passed and Mary Kovacs is now 67 years old. How do we change the *age* value for her in our records? The syntax resembles the one used for insertion:

	database.store("person")
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

Now, wait a minute, if I only want to change her age, why do I need to put all the other attributes in the JSON object? Because *update* considers the whole thing! If you do not specify the other attributes, they will be completely erased! **Notice that they will not become *null*, they will simply disappear and become *undefined* instead.**

We have learned that, when using update, it is mandatory to specify all the fields, including its primary key. So, in the case of our store *email*, you would have to query it first in order to find out the generated primary key for a given record (or just save it somewhere within the call of its *then* method after inserting it).

In a later section, we will learn how to perform more clever updates.

**IMPORTANT:** when executing an *update*, if the record does not exist in the store, it will be **INSERTED** there. This is standard IndexedDB behaviour.

### Removing a record

Removing a record is just as easy as inserting or updating. The only difference is that we only need to inform the keys of the records we wish to remove from the store (not the whole object). Say goodbye to Jean, because he is moving back to France:

	database.store("person")
		.remove(311)				//311 is Jean Fauchelevent's id
		.then(function(keys) {
			console.log(keys);
		});

As usual, the result of the remove call is also a Promise, by which we can access the removed keys.

Just like *insert* and *update*, *remove* accepts an array of keys to be removed. Just remember that this will happen within a transaction, so if an error is to be thrown for ANY record, NONE will be removed.

### Advanced updates

OK, imagine a scenario where I do not have all the information about a record, I only know WHAT has to be changed and in WHICH circumstances. In our previous update example, I said that a year had passed, but why only Mary Kovacs got older? Everybody's age should have been incremented by one, right? This is how we do it:

	database.store("person")
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

First, we call the store's update method just like before, except that this time it does not have any parameters. Then, we specify what we want to *set* (in our example, it is the attribute *age*). We could have used a fixed number, but then everybody would have been updated to the same age. No, what we wanted was to increase the person's previous age by one, so we provide a function that will have access to all of the record's attributes and will decide which changes should be made. Notice that the access to the attributes is made by a *getter* function, so that the actual object is not exposed. You can call *getter* upon any of the record's attribute.

After specifying what we want to *set*, our *update* is configured and can be executed. To do that, we just call its *go* method, just like we did with queries.

This kind of update can also be used alongside indexes and bounding, using the same syntax shown for queries:

1. Sets everybody who is 28 years old to an age of 56 and a male gender:

	```javascript
	database.store("person")
		.update()
		.index("age")
		.equals(29)
		.set({age : 56, gender : "M"})
		.go()
		.then(function(keys) {
			console.log(keys); //prints an array of the affected records' keys
		});
	```
2. You can also ERASE an attribute (instead of setting it to null). In the following example, we remove the *gender* attribute for everyone who is at most 24 years old (exclusively):

	```javascript
	database.store("person")
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
	database.store("person")
		.update()
		.del({
			gender : true,								//Removes the attribute *gender* for everybody
			age : function(getter) {
				return getter("firstname") === "Mary";	//Removes the attribute *age* for those whose first name is Mary
			}
		})
		.go()
		.then(function(keys) {
			console.log(keys); //prints an array of the affected records' keys
		});
	```

4. The *del* method also accepts an array of attributes that should be erased:
*Note:* the *affected keys* array returned in the Promise will contain ALL the keys, even those whose corresponding records were missing the removed attribute. This is because the entire store is traversed when an index or bounding is not specified.

	```javascript
	database.store("person")
		.update()
		.del(["hobbies","birthdate"])
		.go()
	```

### Advanced removal

Very similar to advanced updating and querying. I believe that at this point you will be able to figure out by yourself what the code below does:

	database.store("person")
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

The only important note here is that the *results* returned by the Promise is a bit different from previous sections: it consists of a list of objects with the attributes *key* and *primaryKey*. If an index is specified, *key* will hold the value of the index for that record; if not, it will be the same as *primaryKey*.

### Transactions

I will not go into details about transactions. If you are used to databases, you know how they work. Put simply, a transaction is a group of commands guaranteed to be ENTIRELY persisted in the database or NOT AT ALL: they either succeed together or fail together.

This is exactly what happens, as mentioned earlier, when you provide an array to the insert, update or remove methods. The difference here is that you can now combine those calls and use different stores:

	database.transaction()
		.insert("person", [
			{ id : 900, firstname : "Benjamin", lastname : "Simpson", age : 40, gender : "M"},
			{ id : 901, firstname : "Alice"   , lastname : "Simpson", age : 38, gender : "F"}
		])
		.update("person", { id : 121, firstname : "Grace", lastname : "Minitz" , age : 28, gender : "F" }) //Grace was removed in our "advanced removal" section... this update will recreate her in the store
		.remove("person", 562) //removes the record with key 562 (Mary Kovacs)
		.insert("email", [
			{ email : "ben.simpsone@domain.com", person_id : 900 },
			{ email : "alice.simpsone@domain.com", person_id : 901 }
		])
		.commit()
		.then(function(output) {
			console.log(output);
		});

The *output* within the *then* method is an object containing the names of the stores that suffered some kind of change along with the keys of the modified objects. In the case of the example above, the output will be as follows:

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

### Truncating a store

In order to truncate a store and clear all of its records, just call:

	database.store("person").truncate();

This makes me realize that, generally, the simplest of commands is also the most damaging one...

Anyway, the Promise resulting from this operation will retrieve the store *person*, so you may continue to make operations upon it, but now being sure that the store is empty.

### Waiting for parallel Promises to finish

As mentioned earlier, you can insert, update or remove records within a for loop to avoid the transactional behaviour. But what if we need to WAIT until all the operations have finished before proceeding? All you have to do is use the *ezdb.wait* method. Let us write an example with a loop:

	var people = [
		{ id : 45, firstname : "Joanne" , lastname : "Pope"     , age : 72, gender : "F" },
		{ id : 46, firstname : "Frank"  , lastname : "Schwartz" , age : 51, gender : "M" },
		{ id : 47, firstname : "Jack"   , lastname : "Mills"    , age : 33, gender : "M" }
	];
	
	var keyForRemoval = 222;
	
	var promises = [];
	
	for (var i=0; i < people.length; ++i) {
		promises.push(database.store("person").insert(people[i]));
	}
	
	promises.push(database.store("person").remove(keyForRemoval));
	
	ezdb.wait(promises).then(function(output) {
		console.log(output);
		//Do whatever you need now that all operations have finished.
	});
	
The *output* in the *then* method is an array containing the outputs of every transaction.

Remember that some operations may fail, some not, but the ones that succeed will be persisted in the database regardless of the ones that have gone wrong.

*Note:* You may provide a second function to *then* for error handling.

### Updating you database structure

Suppose we need to change our database's structure: create new stores, drop old ones, add new indexes, remove old ones etc. To do this, we just have to increase the version number when opening the database and write down the differences:

	var database = null;
	ezdb.open({
	    database : "MyFirstDatabase",
	    version : 2,	//New version here!
	    stores : {
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

In our example, we created a new index for store *person*, removed its index called *age* and dropped the store *email*. These, I believe, are all the changes that can be made. Of course, if you need a new store, just add it there.

---
## EZDB vs Web Storage

One might ask why not use Web Storage's localStorage and sessionStorage instead of EZDB's *simple stores*.

If you just want to store a key-value pair of data, then Web Storage is not a bad choice. But you have to pay attention to a tricky aspect of JavaScript, which I shall introduce by telling a (not so) short story about datatypes in JavaScript:

> According to [Wikipedia](https://en.wikipedia.org/wiki/Strong_and_weak_typing), programming languages can be colloquially classified as **strongly typed** or **weakly (loosely) typed**. Historically, JavaScript falls in the latter category, but it is not easy to define it, because although it does keep track of datatypes, sometimes they matter and sometimes they don't:
>
> - JavaScript behaves as any other loosely typed language and evaluates a type dynamically:
> 
> ```javascript
> let foo;	//Variable foo's type is 'undefined'
> foo = 5;	//Variable foo is now of type 'number'
> foo = "a"	//Variable foo is now of type 'string'
> ```
> 
> - But it has this crazy implicit type conversion when comparing values:
> ```javascript
> let foo = 5;
> let bar = "5";
> console.log(foo == bar);	//evaluates to true (although foo is a number and bar is a string)
> ```
> 
> - And deliberately forces you to write an extra equals sign if you want to make sure the variables are of the same time:
> 
> ```javascript
> let foo = 5;
> let bar = "5";
> console.log(foo === bar);	//evaluates to false (because foo is a number and bar is a string)
> ```

So, in the end, sometimes types matter (=== or !==) and sometimes they don't (== or !=).

Getting back to EZDB vs Web Storage, the tricky aspect I mentioned refers to the fact that the latter **converts and stores everything as a string**, while the former **preserves** datatype.

So, for example, Web Storage will consider the number 17 and the string "17" as the same thing, even for keys:

```javascript
let numberKey = 17;
let stringKey = "17";
localStorage.setItem(numberKey, "FOO");
localStorage.setItem(stringKey, "BAR");

let retrievedValueUsingNumberKey = localStorage.getItem(numberKey);
console.log(retrievedValueUsingNumberKey); // outputs "BAR" and not "FOO", since 17 and "17" are treated as the same thing (just like using == in comparisons)
```

For EZDB, on the other hand, 17 and "17" are two different things. If you store a value having the number 17 as key, a query using the string "17" will return nothing (and vice-versa); also, you may have two entries in your *simple store*, one with a key value of 17 (number) and the other with a key value of "17" (string).

Web Storage's treat-everything-as-a-string aspect may also bring about other dangerous and undesirable behaviours. Consider for instance a game webapp that stores the user's score using Web Storage, in order to later update it by some amount:

```javascript
//Just finished a level, sets the score
sessionStorage.setItem("score", 12700);

//Finished the next level and score need an increment of 300 points
let retrievedScore = sessionStorage.getItem("score"); //retrievedScore is the STRING "12700", although we stored the NUMBER 12700
retrievedScore += 300; //since retrievedScore is a string, the plus sign is understood by JavaScript as the 'concat string' operator
console.log(retrievedValue); //outputs 12700300 instead of the expected 13000
```

As you could see, when using Web Storage you have to remember what exactly you stored there. If it's a string, you don't have to do anything, but if it's a number, you have to use parseInt or parseFloat.

When it comes to storing JSON objects, then you have one little extra work: serialize it before storage and deserialize it before usage:

```javascript
let person = { name : "David", age : 45 };
let personId = 11;

/*
localStorage.setItem(personId, person); //WRONG! Storing person like this will call persons's 'toString' method, which returns the string "[object Object]"
*/
localStorage.setItem(personId, JSON.strigigy(person)); //CORRECT. It will store a serialized version of the 'person', that is: "{"name":"David","age":45}"

//

/*
let retrievedPerson = localStorage.getItem(personId);
console.log(person.age); //WRONG! retrievedPerson is a string and does not have an attribute called 'age'
*/
let retrievedPerson = JSON.parse(localStorage.getItem(personId)); //CORRECT. The string within localStorage is converted back to a JSON object 
console.log(person.age); //Outputs 45
```

So the main advantage of EZDB over Web Storage is that you may retrieve the stored values and use them right away, without the need of parsing them first.

The other aspect to consider is that keys of different datatypes are two completely different objects that are going to be treated as different keys. Of course, if you're used to (and dependent on) that crazy implicit conversion I mentioned, then maybe this aspect is a drawback for you, not a positive feature... (sigh)

---
## Final thoughts

There are other libraries out there that will handle the job, possibly much better than this one. As I mentioned earlier, I only wrote this code for a better understanding of how IndexedDB and Promises work and also to practice TypeScript, a language that in my opinion is as fun and fast as JavaScript but not so dreadfully error-prone.

If you decide to use it, please report any bugs you may find so they can be properly fixed, ok?

Have fun!
