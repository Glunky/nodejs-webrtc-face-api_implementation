"use strict";

const createExample = require("../../lib/browser/example");

function setCookie(name, value, options = {}) {
  options = {
    path: '/',
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

function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

function deleteCookie(name) {
  setCookie(name, "", {
    'max-age': -1
  })
}

const Http = new XMLHttpRequest();
const CORS = 'https://cors-anywhere.herokuapp.com/'
const url= CORS + 'http://lk.spiiras.nw.ru/command.php?a=testuser&c=list';
Http.open("GET", url, true);
Http.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
Http.send();

Http.onreadystatechange = (e) => {
  if (Http.readyState == 4 && Http.status == 200) {
    var response = JSON.parse(Http.responseText);
    let fr = document.createElement("h2");
    fr.textContent = "Friends";
    document.body.appendChild(fr);
    let list = document.createElement("ul");
    let userData = getCookie('userData').split('-'); 
    let userLogin = userData[0];
    //console.log(getCookie('userData'));
    response.result.forEach(elName=>{
      if(elName == userLogin) return;
      let el = document.createElement("li");
      el.textContent = elName;
      list.appendChild(el);
    });
    document.body.appendChild(list);
  }
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
