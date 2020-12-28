const express = require('express');
const session = require('cookie-session');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const formidable = require('express-formidable');
const mongourl = 'mongodb+srv://kelvinman:kelvinman@cluster0.xj4ii.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'test';

app.use(formidable());
app.set('view engine','ejs');

const SECRETKEY = 'I want to pass COMPS381F';

const users = new Array(
	{name: 'demo'},
	{name: 'student'}
);

app.set('view engine','ejs');

app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY]
}));

const countRestaurants = (db, criteria, callback) => {
    let cursor = db.collection('restaurant').find(criteria);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        callback(docs);
    });
}


const handle_Read = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        countRestaurants(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('read',{name: req.session.username, count: docs.length, criteria: docs});
        });
    });	
}

const handle_Edit = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        let cursor = db.collection('restaurant').find(DOCID);
        cursor.toArray((err,docs) => {
            client.close();
            assert.equal(err,null);
            res.status(200).render('new',{});
        });
    });
}


const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurant').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res, criteria) => {
    
    var form = new formidable.IncomingForm(); 
    form.parse(req, (err, fields, files) => {
        var DOCID = {};
        DOCID['_id'] = ObjectID(req.fields._id);
        var updateDoc = {};

        updateDoc['name'] = req.fields.name;
        updateDoc['cuisine'] = req.fields.cuisine;
	updateDoc['street'] = req.fields.street;
	updateDoc['building'] = req.fields.building;
	updateDoc['zipcode'] = req.fields.zipcode;
	updateDoc['lon'] = req.fields.lon;
	updateDoc['lat'] = req.fields.lat;
	updateDoc['photo'] = req.fields.photo;
	updateDoc['score'] = null;
	updateDoc['owner'] = req.session.username;

        if (req.files.filetoupload.size > 0) {
            fs.readFile(req.files.filetoupload.path, (err,data) => {
                assert.equal(err,null);
                updateDoc['photo'] = new Buffer.from(data).toString('base64');
                updateDocument(DOCID, updateDoc, (results) => {
                   // res.status(200).render('info', name: ,borough,cuisine,,building,zipcode,on,lat,score,owner)
                });
            });
        } else {
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})
             
            });
        }
})
}

app.get('/', (req,res) => {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/check');
	} else {
		res.redirect('/read');
	}
});

app.get('/check', (req,res) => {
	res.status(200).render('login',{});
});

app.get('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.query.name) {
			req.session.authenticated = req.query.name;
			req.session.username = req.query.name;
		}
	});
	res.redirect('/');	
});

app.get('/read', (req,res) => {
    handle_Edit(res, req.query);
});

app.post('/new', (req,res) => {
    handle_Update(req, res, req.query);
});


app.get('/read', (req,res) => {
	res.status(200).render('new',{});
	handle_Read(res, req.query.docs);
});

app.get('/clear', (req,res) => {
	req.session = null;   // clear cookie-session
	res.redirect('/');
});

app.listen(process.env.PORT || 8099);
