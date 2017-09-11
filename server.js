const fs = require('fs');
const http = require('http');
const https = require('https');

const hostname = 'ec2-35-165-191-120.us-west-2.compute.amazonaws.com';
const port = 443;

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/test.ecommunicate.ch/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/test.ecommunicate.ch/fullchain.pem')
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
			host     : 'tutorial-db-instance.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'nodejs_server',
			password : mysql_db_password,
			database : 'open',
			port : '3306',
		    });
		    
		    connection.connect();

		    forward = "1";

		    if (username  < contact ){
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


		    connection.query('select token from device_tokens where username = "'+contact+'";',function (error, results, fields) {
					 
			if (error) console.log(error);
					 
			for (let i = 0, len = results.length; i < len; ++i) {
			    
			    var token = results[i]["token"];

			    var payload = {
				notification: {
				    title: "",
				    body: '{ "contact" : "' + contact + '", "message" : "' + message + '" }'
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



		});

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
			host     : 'tutorial-db-instance.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'nodejs_server',
			password : mysql_db_password,
			database : 'open',
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
		       

		    connection.query('select * from messages where username1="'+username1+'" and username2 ="'+username2+'";',function (error, results, fields) { 
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


		    connection.end( function(error) {

			json_string = " [ ";

			for (let i = 0, len = messages.length; i < len; ++i){

			    if (i === 0){

				
				json_string = json_string + " { 'forward' : " + forward[i] + ", 'messages': '"+messages[i]+"','time': '' } "

			    }
			    else
				json_string = json_string + " , { 'forward' : " + forward[i] + ", 'messages': '"+messages[i]+"','time': '' } "

			}

			json_string = json_string + " ] "


			response.write(json_string);
			
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
	    const auth_token = JSON.parse(decodeURIComponent(body))["auth_token"];

	    admin.auth().verifyIdToken(auth_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;

		    var connection = mysql.createConnection({
			host     : 'tutorial-db-instance.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'nodejs_server',
			password : mysql_db_password,
			database : 'open',
			port : '3306',
		    });
		    
		    connection.connect();
		    
		    contacts = [];

		    connection.query('select username2 from contacts where username1="'+username+'";',function (error, results, fields) { 

			for (let i = 0, len = results.length; i < len; ++i) {
			    contacts.push(results[i]['username2']);
			}
			
		    });

		    connection.query('select username1 from contacts where username2="'+username+'";',function (error, results, fields) { 

			for (let i = 0, len = results.length; i < len; ++i) {
			    contacts.push(results[i]['username1']);
			}
			
		    });
			
		    connection.end( function(error) {

			json_string = " [ ";

			    json_string = json_string + " { 'id' : " + 1 + ", 'name': '"+username+"','statusMsg': '' }"

			for (let i = 0, len = contacts.length; i < len; ++i){

			    json_string = json_string + ", { 'id' : " + (i+2) + ", 'name': '"+contacts[i]+"','statusMsg': '' }"

			}

			json_string = json_string + " ] "

			response.write(json_string);

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
	    const auth_token = JSON.parse(decodeURIComponent(body))["auth_token"];
	    const device_token  = JSON.parse(decodeURIComponent(body))["device_token"];
	    
	    admin.auth().verifyIdToken(auth_token)
		.then(function(decodedToken) {
		    var username = decodedToken.uid;
		    
		    var connection = mysql.createConnection({
			host     : 'tutorial-db-instance.cphov5mfizlt.us-west-2.rds.amazonaws.com',
			user     : 'nodejs_server',
			password : mysql_db_password,
			database : 'open',
			port : '3306',
		    });
		    
		    connection.connect();
		    
		    connection.query('insert into device_tokens set username = "'+username+'", token="'+device_token+'";',function (error, results, fields) {
					 
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
	    
	    var connection = mysql.createConnection({
		host     : 'tutorial-db-instance.cphov5mfizlt.us-west-2.rds.amazonaws.com',
		user     : 'nodejs_server',
		password : mysql_db_password,
		database : 'open',
		port : '3306',
	    });
	    
	    connection.connect();
	    
	    connection.query('select * from user_info where username = "'+username+'";',function (error, results, fields) {
		
		const hash = crypto.createHash('sha256')
		    .update(JSON.parse(decodeURIComponent(body))["password"])
		    .digest('hex');
		
		if(results[0]['hashed_password'] === hash){
		    admin.auth().createCustomToken(username)
			.then(function(customToken) {
			    response.write(customToken);

			    response.end();
			})
			.catch(function(error) {
			    response.write("Unsuccesful login.");
			    response.end();
			    console.log("Error creating custom token:", error);
			});
		    
		} else {
		    
		}
		
	    });
	    
	    connection.end();
	    
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
	      
