"use strict";

const createStartStopButton = require("./startstopbutton");
const createConnectionsList = require("./connectionslist");
const ConnectionClient = require("../client");
const UserDataInfo = require("../../userDataInfo");

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

  function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
  }

  createStartStopButton(
    async () => {
      let userData = getCookie('userData').split('-');
      let userlogin = userData[0];
      console.log(userlogin);
      peerConnection = await connectionClient.createConnection(
        connectionOptions//, userlogin
      );
      window.peerConnection = peerConnection;
    },
    () => {
      peerConnection.close();
    }
  );
}

module.exports = createExample;
