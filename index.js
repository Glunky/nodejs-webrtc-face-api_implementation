"use strict";

const bodyParser = require("body-parser");
const browserify = require("browserify-middleware");
const express = require("express");
const app = express();
const fs = require('fs');
const https = require('https').createServer({
  key: fs.readFileSync(__dirname + '/ssl/server.key'),
  cert: fs.readFileSync(__dirname + '/ssl/server.cert')
}, app);
const { readdirSync, statSync } = require("fs");
const { join } = require("path");

const {
  mount: mountConnectionApi
} = require("./lib/server/rest/connectionsapi");
const WebRtcConnectionManager = require("./lib/server/connections/webrtcconnectionmanager");



app.use(bodyParser.json());

const examplesDirectory = join(__dirname, "examples");

const examples = readdirSync(examplesDirectory).filter(path =>
  statSync(join(examplesDirectory, path)).isDirectory()
);

function setupExample(example) {
  const path = join(examplesDirectory, example);
  const clientPath = join(path, "client.js");
  const serverPath = join(path, "server.js");

  app.use(`/${example}/index.js`, browserify(clientPath));
  app.get(`/${example}/index.html`, (req, res) => {
    res.sendFile(join(__dirname, "html", "index.html"));
  });

  const options = require(serverPath);
  const connectionManager = WebRtcConnectionManager.create(options);
  mountConnectionApi(app, connectionManager, `/${example}`);

  return connectionManager;
}

app.get("/", (req, res) => res.redirect(`${examples[0]}/index.html`));

const connectionManagers = examples.reduce((connectionManagers, example) => {
  const connectionManager = setupExample(example);
  return connectionManagers.set(example, connectionManager);
}, new Map());

const server = https.listen(3000, () => {
  const address = server.address();
  console.log(`https://localhost:${address.port}\n`);

  server.once("close", () => {
    connectionManagers.forEach(connectionManager => connectionManager.close());
  });
});
