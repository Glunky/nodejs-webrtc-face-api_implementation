"use strict";

const createExample = require("../../lib/browser/example");

const localVideo = document.createElement("video");
localVideo.autoplay = true;

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
  const broadcasted = peerConnection
    .getReceivers()
    .map(receiver => receiver.track)[2];
  const remoteBroadcastStream = new MediaStream([broadcasted]);
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
