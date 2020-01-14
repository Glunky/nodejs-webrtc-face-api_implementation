"use strict";

const bodyParser = require("body-parser");
const browserify = require("browserify-middleware");
const express = require("express");
const app = express();
const fs = require('fs');
const http = require('http');
const https = require('https').createServer({
  key: fs.readFileSync(__dirname + '/ssl/server.key'),
  cert: fs.readFileSync(__dirname + '/ssl/server.cert')
}, app);

const { readdirSync, statSync } = require("fs");
const { join } = require("path");
const { mount: mountConnectionApi } = require("./lib/server/rest/connectionsapi");
const objectHash = require('object-hash');
const cookieParser = require('cookie-parser');

const WebRtcConnectionManager = require("./lib/server/connections/webrtcconnectionmanager");
const urlencodedParser = bodyParser.urlencoded({extended: false});

const examplesDirectory = join(__dirname, "examples");
const examples = readdirSync(examplesDirectory).filter(path =>
  statSync(join(examplesDirectory, path)).isDirectory()
);

function setupExample(example) {
  const path = join(examplesDirectory, example);
  const clientPath = join(path, "client.js");
  const serverPath = join(path, "server.js");

  function isObjectEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
  }

  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(`/${example}/index.js`, browserify(clientPath));
  app.get(`/${example}/index.html`, (req, res) => {
    if(!isObjectEmpty(req.cookies)){
      res.sendFile(join(__dirname, "html", "index.html"));
    }
    else res.send("Войтите в систему");
  });
  app.get("/", function(request, response){
    response.sendFile(__dirname + "/html/login.html");
  });

  app.post("/", urlencodedParser, function (request, response) {
    const login = request.body.login;
    const password = request.body.password;
    http.get(`http://lk.spiiras.nw.ru/command.php?a=login&login=${login}&password=${password}`, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
    
      resp.on('end', () => {
        if(JSON.parse(data).error == 0){
         const user = {
            login: login,
            password: password,
          }
          const hash = objectHash.MD5(user);
          response.cookie('userHash', hash);
          response.redirect("/send-remote-face/index.html");
        }
        else response.send("Нет такого пользователя")
      });
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
  });

  const options = require(serverPath);
  const connectionManager = WebRtcConnectionManager.create(options);
  mountConnectionApi(app, connectionManager, `/${example}`);

  return connectionManager;
}

const connectionManagers = examples.reduce((connectionManagers, example) => {
  const connectionManager = setupExample(example);
  return connectionManagers.set(example, connectionManager);
}, new Map());

const server = https.listen(3000, () => {
  const address = server.address();
  console.log(`https://localhost:${address.port}\n`);

  server.once("close", (req,res) => {
    console.log(req)
    connectionManagers.forEach(connectionManager => connectionManager.close());
  });
});
