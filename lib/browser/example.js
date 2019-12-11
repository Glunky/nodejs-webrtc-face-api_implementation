"use strict";

const createStartStopButton = require("./startstopbutton");
const createConnectionsList = require("./connectionslist");
const ConnectionClient = require("../client");

function createExample(name, description, options = {}) {
  options = {
    upload: false,
    withBroadcast: () => {},
    beforeAnswer: () => {},
    ...options
  };

  const { upload, withBroadcast, ...connectionOptions } = options;

  const nameTag = document.createElement("h2");
  nameTag.innerText = name;
  document.body.appendChild(nameTag);

  const descriptionTag = document.createElement("p");
  descriptionTag.innerHTML = description;
  document.body.appendChild(descriptionTag);

  const clickStartTag = document.createElement("p");
  clickStartTag.innerHTML = "Click &ldquo;Start&rdquo; to begin.";
  document.body.appendChild(clickStartTag);

  const connectionClient = new ConnectionClient();

  let peerConnection = null;
  let broadcastConnection = null;

  if (upload) {
    createConnectionsList(
      async () => {
        return await connectionClient.getConnections();
      },
      async client => {
        broadcastConnection = await connectionClient.broadcastConnection({
          broadcast: client,
          withBroadcast
        });
        window.broadcastConnection = broadcastConnection;
      }
    );
  }

  createStartStopButton(
    async () => {
      peerConnection = await connectionClient.createConnection(
        connectionOptions
      );
      window.peerConnection = peerConnection;
    },
    () => {
      peerConnection.close();
    }
  );
}

module.exports = createExample;
