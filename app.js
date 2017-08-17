const http = require('http');

const hostname = 'ec2-35-165-191-120.us-west-2.compute.amazonaws.com';
const port = 80;

var admin = require("firebase-admin");

var serviceAccount = require("/home/ec2-user/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ecommunicate-5a295.firebaseio.com"
});

var registrationToken = "e6AVusNPakw:APA91bFDfSWdFqebtawjWLnphbwIMWYsBLbznA6nhrNbG-2snYapXgg26HrHy8tsbkbPUjMFn4__EcJXRh4Flca_5NEuaX3VFTy_2gcf4-q2wP6mEkbs2kFTt0Bwr4lr2VObgDsCpP-N";

var payload = {
  notification: {
    title: "$GOOG up 1.43% on the day",
    body: "$GOOG gained 11.80 points to close at 835.67, up 1.43% on the day."
  }
};


admin.messaging().sendToDevice(registrationToken, payload)
  .then(function(response) {
    console.log("Successfully sent message:", response);
  })
  .catch(function(error) {
    console.log("Error sending message:", error);
  });

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Test\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
