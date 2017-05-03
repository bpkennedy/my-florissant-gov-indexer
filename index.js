var express = require('express');
var app = express();
var firebaseAdmin = require("firebase-admin");
var algoliasearch = require('algoliasearch');

app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.render('public/index.html');
});


if(process.env.NODE_ENV === "production") {
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert({
      "private_key": process.env.FIREBASE_PRIVATE_KEY,
      "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} else {
  var dotenv = require('dotenv');
  // load values from the .env file in this directory into process.env
  dotenv.load();
  var serviceAccount = require("./serviceAccountKey.json");
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

var database = firebaseAdmin.database();

// configure algolia
var algolia = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
var index = algolia.initIndex('my-florissant-gov');


// // listening is all configured, let's add some contacts
// Promise.all([
//   database.ref('/documents').push({
//     fileName: 'TestDoc1',
//     fileType: 'pdf',
//     docType: 'agenda',
//     fileContent: 'Here is where a huge amount of text content goes - about kittens and puppies and stuff.'
//   }),
//   database.ref('/documents').push({
//     fileName: 'TestDoc2',
//     fileType: 'pdf',
//     docType: 'meeting minutes',
//     fileContent: 'Here is a second example of text content.  Lets see how this works out and stuff.'
//   })]).then(function() {
//     console.log("Contacts loaded to firebase");
//     process.exit(0);
//   }).catch((function(error) {
//     console.error("Error loading firebase", error);
//     process.exit(-1);
//   }));

// // initial index load of all ref
// var documentsRef = database.ref("/documents");
// documentsRef.once('value', initialImport);
// function initialImport(dataSnapshot) {
//   // Array of data to index
//   var objectsToIndex = [];
//   // Get all objects
//   var values = dataSnapshot.val();
//   // Process each child Firebase object
//   dataSnapshot.forEach((function(childSnapshot) {
//     // get the key and data from the snapshot
//     var childKey = childSnapshot.key;
//     var childData = childSnapshot.val();
//     // Specify Algolia's objectID using the Firebase object key
//     childData.objectID = childKey;
//     // Add object for indexing
//     objectsToIndex.push(childData);
//   }))
//   // Add or update new objects
//   index.saveObjects(objectsToIndex, function(err, content) {
//     if (err) {
//       throw err;
//     }
//     console.log('Firebase -> Algolia import done');
//     process.exit(0);
//   });
// }

var documentsRef = database.ref("/documents");

documentsRef.on('child_added', addOrUpdateIndexRecord);
documentsRef.on('child_changed', addOrUpdateIndexRecord);
documentsRef.on('child_removed', deleteIndexRecord);

function addOrUpdateIndexRecord(dataSnapshot) {
  // Get Firebase object
  var firebaseObject = dataSnapshot.val();
  // Specify Algolia's objectID using the Firebase object key
  firebaseObject.objectID = dataSnapshot.key;
  // Add or update object
  index.saveObject(firebaseObject, function(err, content) {
    if (err) {
      throw err;
    }
    console.log('Firebase object indexed in Algolia', firebaseObject.objectID);
  });
}

function deleteIndexRecord(dataSnapshot) {
  // Get Algolia's objectID from the Firebase object key
  var objectID = dataSnapshot.key;
  // Remove the object from Algolia
  index.deleteObject(objectID, function(err, content) {
    if (err) {
      throw err;
    }
    console.log('Firebase object deleted from Algolia', objectID);
  });
}

app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
