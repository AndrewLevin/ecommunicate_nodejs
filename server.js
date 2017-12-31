const fs = require('fs');
const http = require('http');
const https = require('https');

const hostname = 'ec2-35-165-191-120.us-west-2.compute.amazonaws.com';
const port = 443;

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/chat.android.ecommunicate.ch/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/chat.android.ecommunicate.ch/fullchain.pem')
};

var admin = require("firebase-admin");

var serviceAccount = require("/home/ec2-user/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ecommunicate-5a295.firebaseio.com"
});

const server = https.createServer(options, (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  //res.end('Test\n');
});


server.listen(port, hostname, () => {
  console.log(`Server running at https://${hostname}:${port}/`);
});

var mysql_db_password = fs.readFileSync('/home/ec2-user/secrets.txt').toString().split('\n')[0];

var mysql      = require('mysql');

crypto = require('crypto')

server.on('request', (request, response) => {

    var now = new Date();

    console.log(now.toISOString());
    console.log(request.url);
    console.log(request.method);
    console.log(request.headers);

    if (request.method === 'POST' && request.url === '/submitmessage/'){

	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {

	    body = Buffer.concat(body).toString();

	    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];

	    const contact = JSON.parse(decodeURIComponent(body))["contact"];

	    const message = JSON.parse(decodeURIComponent(body))["message"];

	    admin.auth().verifyIdToken(id_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;

		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
		    });
		    
		    connection.connect();

		    forward = "1";

		    if (username  < contact){
			username1 = username;
			username2 = contact;

		    } else {
			username2 = username;
			username1 = contact;
			forward = "0";
		    }

		    var now = new Date();

		    connection.query('insert into messages set username1="'+username1+'", username2 ="'+username2+'", forward="'+forward+'", message="'+message+'", time = "'+now.toISOString()+'";',function (error, results, fields) { 
			response.end();
		    });

		    if (forward == "0") {

			connection.query('update contacts set new_message_username1=1 where username1="'+username1+'" and username2 ="'+username2+'";',function (error, results, fields) { 

			});

		    } else {

			connection.query('update contacts set new_message_username2=1 where username1="'+username1+'" and username2 ="'+username2+'";',function (error, results, fields) { 

			});

		    }


		    connection.query('select token from device_tokens_chat where username = "'+contact+'";',function (error, results, fields) {
					 
			if (error) console.log(error);
					 
			for (let i = 0, len = results.length; i < len; ++i) {
			    
			    var token = results[i]["token"];

			    var payload = {
				notification: {
				    title: "",
				    body: username + ': '+message,
				    collapse_key : 'ecommunicate chat '+ username,
				    tag : 'ecommunicate chat '+username
				},
				data:  {
				    'contact' : username,
				    'message' : message
				}
			    };
			    
			    admin.messaging().sendToDevice(token, payload)
				.then(function(response) {
				    console.log("Successfully sent message:", response);
				})
				.catch(function(error) {
				    console.log("Error sending message:", error);
				});
			}
			
			
			
		    });


		    connection.end( function(error) { });



		});

	});
    }

    if (request.method === 'POST' && request.url === '/new_message_browser/'){
	
	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {

	    body = Buffer.concat(body).toString();
	    var username1 = JSON.parse(decodeURIComponent(body))["username1"];
	    var username2 = JSON.parse(decodeURIComponent(body))["username2"];
	    var forward = JSON.parse(decodeURIComponent(body))["forward"];

	    if (forward == "0")
		forward = false;
	    else
		forward = true;

	    new_message_username1 = false;
	    new_message_username2 = false;


	    var connection = mysql.createConnection({
		host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
		user     : 'android_chat',
		password : mysql_db_password,
		database : 'ecommunicate',
		port : '3306',
	    });
	    


	    if (username1 == username2){

		connection.connect();

		device_tokens = []

		connection.query('select token from device_tokens_chat where username = "'+username1+'";',function (error, results, fields) { 
		    
		    for (let i = 0, len = results.length; i < len; ++i) {
			
			device_tokens.push(results[i]["token"]);
			
		    }	

		});

		latest_message = ""

		connection.query('select message from messages where username1="'+username1+'" and username2 ="'+username2+'" order by time desc limit 1;',function (error, results, fields) { 
		    if (results.length > 0 )
			latest_message = results[0]["message"]
		});
			
		 
		connection.end( function(error) {
		    
		    for (let i = 0, len = device_tokens.length; i < len; ++i) {
			
			var token = device_tokens[i];
			
			var payload = {
			    notification: {
				title: "",
				body: username1 + ': ' + latest_message,
				collapse_key : 'ecommunicate chat '+ username1,
				tag : 'ecommunicate chat '+username1
				
			    },
			    data:  { 
				'contact' : username1, 
				'message' : latest_message
			    }
			};
			
			admin.messaging().sendToDevice(token, payload)
			    .then(function(response) {
				console.log("Successfully sent message:", response);
			    })
			    .catch(function(error) {
				console.log("Error sending message:", error);
			    });
		    }	    
		});
	    }
	    else {		

		connection.connect();

		connection.query('select new_message_username1, new_message_username2 from contacts where username1="'+username1+'" and username2 ="'+username2+'";',function (error, results, fields) { 
		    
		    new_message_username1 = results[0]["new_message_username1"];
		    new_message_username2 = results[0]["new_message_username2"];

		    if (forward && new_message_username2) {
			
			latest_message_forward = ""
			
			
			connection.query('select message from messages where username1="'+username1+'" and username2 ="'+username2+'" and forward = 1 order by time desc limit 1;',function (error, results, fields) { 
			    if (results.length > 0 )
				latest_message_forward = results[0]["message"]
			});
			
			
			device_tokens_username2 = [];
			
			connection.query('select token from device_tokens_chat where username = "'+username2+'";',function (error, results, fields) { 
			    
			    for (let i = 0, len = results.length; i < len; ++i) {
				
				device_tokens_username2.push(results[i]["token"]);
				
			    }	
			
			});
			
			connection.end( function(error) {
			    
			    for (let i = 0, len = device_tokens_username2.length; i < len; ++i) {
				
				var token = device_tokens_username2[i];
				
				var payload = {
				    notification: {
					title: "",
					body: username1 + ': '+latest_message_forward,
					collapse_key : 'ecommunicate chat '+ username1,
					tag : 'ecommunicate chat '+username1
					
				    },
				    
				    data:  { 
					'contact' : username1, 
					'message' : latest_message_forward  
				    }
				    
				};
				
				admin.messaging().sendToDevice(token, payload)
				    .then(function(response) {
					console.log("Successfully sent message:", response);
				    })
				    .catch(function(error) {
					console.log("Error sending message:", error);
				    });
			    }
			    
			});
			
			
			
		    }
		    
		    if (!forward && new_message_username1) {
			
			latest_message_backward = ""
			
			connection.query('select message from messages where username1="'+username1+'" and username2 ="'+username2+'" and forward = 0 order by time desc limit 1;',function (error, results, fields) { 
			    if (results.length > 0 )
				latest_message_backward = results[0]["message"]
			});
			
			
			device_tokens_username1 = [];
			
			connection.query('select token from device_tokens_chat where username = "'+username1+'";',function (error, results, fields) { 
			    
			    for (let i = 0, len = results.length; i < len; ++i) {
				
				device_tokens_username1.push(results[i]["token"]);
				
			    }	
			
			});

			connection.end( function(error) {
			    
			    for (let i = 0, len = device_tokens_username1.length; i < len; ++i) {
				
				var token = device_tokens_username1[i];
				
				var payload = {
				    notification: {
					title: "",
					body: username2 + ': ' + latest_message_backward,
					collapse_key : 'ecommunicate chat '+ username2,
					tag : 'ecommunicate chat '+username2
					
				    },
				    data:  { 
					'contact' : username2, 
					'message' : latest_message_backward
				    }
				};
				
				admin.messaging().sendToDevice(token, payload)
				    .then(function(response) {
					console.log("Successfully sent message:", response);
				    })
				    .catch(function(error) {
					console.log("Error sending message:", error);
				    });
			    }
			    
			});
			
		    }		
		});
		
		
	    }
	      
	});
    }
	      
    if (request.method === 'POST' && request.url === '/messages/'){

	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {

	    body = Buffer.concat(body).toString();

	    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];

	    const contact = JSON.parse(decodeURIComponent(body))["contact"];

	    admin.auth().verifyIdToken(id_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;

		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
		    });
		    
		    connection.connect();
		    
		    messages = [];
		    forward = [];
		    reverse_forward = false;


		   if (username  < contact ){
		       username1 = username;
		       username2 = contact;
		       reverse_forward = true;
		    } else {
		       username2 = username;
		       username1 = contact;
		    }
		       

		    connection.query('(select * from messages where username1="'+username1+'" and username2 ="'+username2+'" order by time desc limit 30) order by time asc;',function (error, results, fields) { 
			for (let i = 0, len = results.length; i < len; ++i) {
			    messages.push(results[i]["message"]);
			    if (reverse_forward){

				if (results[i]["forward"])
				    forward.push("false");
				else
				    forward.push("true");
				
			    } else {

				if (results[i]["forward"])
				    forward.push("true");
				else
				    forward.push("false");

			    }

			}
			
		    });

		    if (reverse_forward)
			connection.query('update contacts set new_message_username1=0 where username1="'+username1+'" and username2 ="'+username2+'";',function (error, results, fields) {});
		    else
			connection.query('update contacts set new_message_username2=0 where username1="'+username1+'" and username2 ="'+username2+'";',function (error, results, fields) {});


		    connection.end( function(error) {

			json_array = [];

			for (let i = 0, len = messages.length; i < len; ++i){

			    json_array.push({"forward" : forward[i], "messages" : messages[i], "time" : "" });

			}

			response.write(JSON.stringify(json_array));
			
			response.end();

		    });
		});
	});


    }

    if (request.method === 'POST' && request.url === '/contacts/'){

	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {

	    body = Buffer.concat(body).toString();
	    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];

	    admin.auth().verifyIdToken(id_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;

		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
		    });
		    
		    connection.connect();
		    
		    contacts_usernames = [];		    
		    contacts_names = [];
		    contacts_new_message = [];

		    connection.query('select name from user_info where username="'+username+'";',function (error, results, fields) {
		
			contacts_usernames.push(username);
			contacts_names.push(results[0]['name']);
			contacts_new_message.push("false");

		    });

		    connection.query('select a.username2, a.new_message_username1, b.name from contacts a, user_info b where a.username1="'+username+'" and b.username = a.username2;',function (error, results, fields) { 

			
			for (let i = 0, len = results.length; i < len; ++i) {
			    contacts_usernames.push(results[i]['username2']);
			    contacts_names.push(results[i]['name']);
			    if ( results[i]['new_message_username1'] == 0)
				contacts_new_message.push("false");
			    else
				contacts_new_message.push("true");
			}
			
			
			
		    });

		    connection.query('select a.username1, a.new_message_username2, b.name from contacts a, user_info b where a.username2="'+username+'" and b.username = a.username1;',function (error, results, fields) { 


			for (let i = 0, len = results.length; i < len; ++i) {
			    contacts_usernames.push(results[i]['username1']);
			    contacts_names.push(results[i]['name']);
			    if ( results[i]['new_message_username2'] == 0)
				contacts_new_message.push("false");
			    else
				contacts_new_message.push("true");
			}
			
		    });
			
		    connection.end( function(error) {

			json_array =[]

			for (let i = 0, len = contacts_usernames.length; i < len; ++i){

			    json_array.push({ "id" : (i+1), "username" : contacts_usernames[i], "name": contacts_names[i], "new_message" : contacts_new_message[i]});

			}

			response.write(JSON.stringify(json_array));

			response.end();	    
		    
		    });





		});
	})
    }

    if (request.method === 'POST' && request.url === '/getcontactrequests/'){

	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {

	    body = Buffer.concat(body).toString();
	    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];

	    admin.auth().verifyIdToken(id_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;

		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
		    });
		    
		    connection.connect();
		    
		    contact_request_usernames = [];		    

		    contact_request_messages = [];		    

		    connection.query('select username2,message from contact_requests where username1="'+username+'" and forward=0;',function (error, results, fields) {
			
			for (let i = 0, len = results.length; i < len; ++i) {

			    contact_request_usernames.push(results[i]["username2"]);
			    contact_request_messages.push(results[i]["message"]);

			}

		    });

		    connection.query('select username1,message from contact_requests where username2="'+username+'" and forward = 1;',function (error, results, fields) {
		
			for (let i = 0, len = results.length; i < len; ++i) {

			    contact_request_usernames.push(results[i]["username1"]);
			    contact_request_messages.push(results[i]["message"]);
			}
			

		    });

		    connection.end( function(error) {

			json_array =[]

			for (let i = 0, len = contact_request_usernames.length; i < len; ++i){

			    json_array.push({ "id" : (i+1), "username" : contact_request_usernames[i], "name" : "", "message" : contact_request_messages[i]});

			}

			response.write(JSON.stringify(json_array));

			response.end();	    
		    
		    });





		});
	})
    }

    if (request.method === 'POST' && request.url === '/submitcontactrequestresponse/'){

	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {

	    body = Buffer.concat(body).toString();
	    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
	    const contact = JSON.parse(decodeURIComponent(body))["username"];
	    const accept = JSON.parse(decodeURIComponent(body))["accept"];

	    admin.auth().verifyIdToken(id_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;

		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
		    });
		    
		    connection.connect();
		    
		    forward = "1";

		    if (username  < contact){
			username1 = username;
			username2 = contact;

		    } else {
			username2 = username;
			username1 = contact;
			forward = "0";
		    }

		    var now = new Date();

		    contact_request_usernames = [];		    

		    if (accept == "false"){

			connection.query('delete from contact_requests where username1="'+username1+'" and username2="'+username2+'";',function (error, results, fields) { });

			console.log("contact request rejected");

		    }

		    if (accept == "true"){


			connection.query('insert into contacts set username1="'+username1+'", new_message_username1 = 0, new_message_username2 = 0, username2 ="'+username2+'", accept_time = "'+now.toISOString()+'";',function (error, results, fields) { });
			
			connection.query('delete from contact_requests where username1="'+username1+'" and username2="'+username2+'";',function (error, results, fields) { });

			console.log("contact request accepted");

		    }
		    

		    connection.end( function(error) {

			json_object = {"success" : true, "reason" : ""}

			response.write(JSON.stringify(json_object));

			response.end();	    
		    
		    });





		});
	})
    }

    if (request.method === 'POST' && request.url === '/registerdevice/'){

	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {

	    body = Buffer.concat(body).toString();
	    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];
	    const device_token  = JSON.parse(decodeURIComponent(body))["device_token"];
	    
	    admin.auth().verifyIdToken(id_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;
		    
		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
		    });
		    
		    connection.connect();
		    
		    var now = new Date();

		    connection.query('insert into device_tokens_chat set username = "'+username+'", token="'+device_token+'", registration_time="'+now.toISOString()+'";',function (error, results, fields) {
					 
			if (error) console.log(error);
					 
		    });
		    
		    connection.end();
		    
		    response.end();

		}).catch(function(error) {
		    
		    console.log(error);
		    
		    // Handle error
		});
	    
	    
	    

	})
    }
		  
    if (request.method === 'POST' && request.url === '/login/') {
	
	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {
	    body = Buffer.concat(body).toString();
	    const username = JSON.parse(decodeURIComponent(body))["username"];
	    
	    console.log(username);

	    var connection = mysql.createConnection({
		host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
		user     : 'android_chat',
		password : mysql_db_password,
		database : 'ecommunicate',
		port : '3306',
	    });
	    
	    connection.connect();
	    
	    console.log('select * from user_info where username = "'+username+'";');

	    connection.query('select * from user_info where username = "'+username+'";',function (error, results, fields) {
		
		const hash = crypto.createHash('sha256')
		    .update(JSON.parse(decodeURIComponent(body))["password"])
		    .digest('hex');
		
		console.log(results);
		console.log(error);

		if(Array.isArray(results) && results.length == 1 &&  results[0]['hashed_password'] === hash){
		    admin.auth().createCustomToken(username)
			.then(function(customToken) {

			    console.log("Successful login for username "+ username+".");

			    json_object = {"success" : true, "custom_token" : customToken};

			    console.log(json_object);

			    response.write(JSON.stringify(json_object));

			    response.end();
			})

			.catch(function(error) {

			    console.log("Unsuccessful login for username "+ username+".");

			    console.log("Error creating custom token:", error);

			    json_object = {"success" : false, "custom_token" : ""};

			    console.log(json_object);

			    response.write(JSON.stringify(json_object));
			    
			    response.end();

			});
		    
		} else {

		    json_object = {"success" : false, "custom_token" : ""};

		    console.log(json_object);

		    response.write(JSON.stringify(json_object));
		    response.end();
		    console.log("Unsuccessful login for username "+ username+".");
		    
		}
		
	    });
	    
	    connection.end();
	    
	});
    }

    if (request.method === 'POST' && request.url === '/makecontactrequest/') {
	
	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {
	    body = Buffer.concat(body).toString();
	    const contact = JSON.parse(decodeURIComponent(body))["username"];
	    const message = JSON.parse(decodeURIComponent(body))["message"];
	    const id_token = JSON.parse(decodeURIComponent(body))["id_token"];

	    admin.auth().verifyIdToken(id_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;

		    var connection = mysql.createConnection({
			host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'android_chat',
			password : mysql_db_password,
			database : 'ecommunicate',
			port : '3306',
		    });
		    
		    forward = "1";

		    if (username  < contact){
			username1 = username;
			username2 = contact;

		    } else {
			username2 = username;
			username1 = contact;
			forward = "0";
		    }

		    var now = new Date();


		    connection.connect();
		    
		    var results1;

		    var results2;

		    var results3;

		    connection.query('select * from user_info where username = "'+contact+'";',function (error, results, fields) {

			results1 = results;

		    });
		    
		    connection.query('select * from contacts where username1 = "'+username1+'" and username2 = "'+username2+'";',function (error, results, fields) {
			results2 = results;
			
			
			
		    });

		    connection.query('select * from contact_requests where username1 = "'+username1+'" and username2 = "'+username2+'";',function (error, results, fields) {
			
			results3 = results;

			
		    });
		    
		    connection.end( function(error) { 

			
			if (username1.toLowerCase().trim() == username2.toLowerCase().trim()) {

			    json_object = {"success" : false, "reason" : "This is your username. You can always chat with yourself. You do not need to make a contact request."};
			    
			    response.write(JSON.stringify(json_object));
			    response.end();

			    console.log("Unsuccessful contact request from " + username + " to " + contact + ".");

			    return;

			}

			if(results1.length == 0){
				    

			    json_object = {"success" : false, "reason" : "Username does not exist."};
			    
			    response.write(JSON.stringify(json_object));
			    response.end();
			    console.log("Unsuccessful contact request from " + username + " to " + contact + ".");

			    return;
			    
			}


			if(results2.length == 1){
				    
			    console.log("Unsuccessful contact request from " + username + " to " + contact + ".");

			    json_object = {"success" : false, "reason" : "This username is already one of your contacts."};
			    
			    response.write(JSON.stringify(json_object));
			    
			    response.end();

			    return;
			}


			if(results3.length == 1){
				    
			    console.log("Unsuccessful contact request from " + username + " to " + contact + ".");
			    
			    json_object = {"success" : false, "reason" : "A contact request already exists for you and this username."};
			    
			    response.write(JSON.stringify(json_object));
			    
			    response.end();

			    return;
			}

			var new_connection = mysql.createConnection({
			    host     : 'ecommunicate-production.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			    user     : 'android_chat',
			    password : mysql_db_password,
			    database : 'ecommunicate',
			    port : '3306',
			});
			
			new_connection.connect();

			new_connection.query('insert into contact_requests set username1="'+username1+'", username2 ="'+username2+'", forward="'+forward+'", message="'+message+'", request_time = "'+now.toISOString()+'";',function (error, results, fields) { 

			    json_object = {"success" : true, "reason" : ""};
			    
			    response.write(JSON.stringify(json_object));

			    response.end();

			    console.log("Successful contact request from " + username + " to " + contact + ".");

			});


			new_connection.end();



		    });
		    
		});
	});

    }
    
    if (request.method === 'POST' && request.url === '/register/') {
	
	let body = [];
	request.on('data', (chunk) => {
	    body.push(chunk);
	}).on('end', () => {
	    body = Buffer.concat(body).toString();
	});
    }
    
});
	      
