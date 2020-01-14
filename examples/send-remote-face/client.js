"use strict";

const createExample = require("../../lib/browser/example");

function setCookie(name, value, options = {}) {

  options = {
    path: '/',
    // при необходимости добавьте другие значения по умолчанию
    ...options
  };

  let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

  for (let optionKey in options) {
    updatedCookie += "; " + optionKey;
    let optionValue = options[optionKey];
    if (optionValue !== true) {
      updatedCookie += "=" + optionValue;
    }
  }

  document.cookie = updatedCookie;
}

function deleteCookie(name) {
  setCookie(name, "", {
    'max-age': -1
  })
}

const logoutBtn = document.createElement('button');
logoutBtn.innerHTML = "logout";
logoutBtn.onclick = () => {
  deleteCookie('userHash');
  var urlParts = location.href.split("/");
  location.href = urlParts[0] + "//" + urlParts[2];
}
document.body.appendChild(logoutBtn);


const localVideo = document.createElement("video");
localVideo.autoplay = true;
localVideo.muted = true;

const remoteBroadcastVideo = document.createElement("video");
remoteBroadcastVideo.autoplay = true;

async function beforeAnswer(peerConnection) {
  const localStream = await window.navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });

  localStream
    .getTracks()
    .forEach(track => peerConnection.addTrack(track, localStream));

  localVideo.srcObject = localStream;

  // NOTE(mroberts): This is a hack so that we can get a callback when the
  // RTCPeerConnection is closed. In the future, we can subscribe to
  // "connectionstatechange" events.
  const { close } = peerConnection;
  peerConnection.close = function() {
    localVideo.srcObject = null;
    remoteBroadcastVideo.srcObject = null;

    localStream.getTracks().forEach(track => track.stop());

    return close.apply(this, arguments);
  };
}

async function withBroadcast(peerConnection) {
  const remoteStream = peerConnection
    .getReceivers()
    .map(receiver => receiver.track);
    console.log(remoteStream);
  const remoteBroadcastStream = new MediaStream([remoteStream[2], remoteStream[3]]);
  remoteBroadcastVideo.srcObject = remoteBroadcastStream;
}

createExample("send-remote-face", "", {
  beforeAnswer,
  withBroadcast,
  upload: true
});

const videos = document.createElement("div");
videos.className = "grid";
videos.appendChild(localVideo);
videos.appendChild(remoteBroadcastVideo);
document.body.appendChild(videos);
