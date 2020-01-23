"use strict";

const fetch = require("node-fetch");
const DefaultRTCPeerConnection = require("wrtc").RTCPeerConnection;
const { RTCSessionDescription } = require("wrtc");

const TIME_TO_HOST_CANDIDATES = 3000; 

class ConnectionClient {
  constructor(options = {}) {
    options = {
      RTCPeerConnection: DefaultRTCPeerConnection,
      clearTimeout,
      host: "",
      prefix: ".",
      setTimeout,
      timeToHostCandidates: TIME_TO_HOST_CANDIDATES,
      ...options
    };

    const { RTCPeerConnection, prefix, host } = options;

    let peerConnection = null;

    this.connection = null;

    this.getConnections = async () => {
      const response1 = await fetch(`${host}${prefix}/connections`);
      const allConnections = await response1.json();
      const anotherConnections = allConnections
        .map(({ id: connection }) => connection)
        .filter(connection => connection !== this.connection);
      return anotherConnections;
    };

    this.createConnection = async (options = {}) => {
      options = {
        beforeAnswer() {},
        stereo: false,
        ...options
      };

      const { beforeAnswer, stereo } = options;

      const response1 = await fetch(`${host}${prefix}/connections`, {
        method: "POST"
      });

      const remotePeerConnection = await response1.json();
      const { id } = remotePeerConnection;

      const localPeerConnection = new RTCPeerConnection({
        sdpSemantics: "unified-plan"
      });

      localPeerConnection.close = function() {
        fetch(`${host}${prefix}/connections/${id}`, {
          method: "delete"
        }).catch(() => {});
        return RTCPeerConnection.prototype.close.apply(this, arguments);
      };

      try {
        await localPeerConnection.setRemoteDescription(
          remotePeerConnection.localDescription
        );

        await beforeAnswer(localPeerConnection);

        const originalAnswer = await localPeerConnection.createAnswer();
        const updatedAnswer = new RTCSessionDescription({
          type: "answer",
          sdp: stereo
            ? enableStereoOpus(originalAnswer.sdp)
            : originalAnswer.sdp
        });
        await localPeerConnection.setLocalDescription(updatedAnswer);

        await fetch(`${host}${prefix}/connections/${id}/remote-description`, {
          method: "POST",
          body: JSON.stringify(localPeerConnection.localDescription),
          headers: {
            "Content-Type": "application/json"
          }
        });

        this.connection = id;

        peerConnection = localPeerConnection;

        return localPeerConnection;
      } catch (error) {
        localPeerConnection.close();
        throw error;
      }
    };

    this.broadcastConnection = async (options = {}) => {
      options = {
        broadcast: null,
        stereo: false,
        withBroadcast: () => {},
        ...options
      };

      const { broadcast, stereo, withBroadcast } = options;

      if (!window.peerConnection) {
        return null;
      }

      const response1 = await fetch(
        `${host}${prefix}/broadcast-connections/${this.connection}?ask=${broadcast}`
      );

      const remotePeerConnection = await response1.json();
      const { id } = remotePeerConnection;

      try {
        await peerConnection.setRemoteDescription(
          remotePeerConnection.localDescription
        );

        const originalAnswer = await peerConnection.createAnswer();
        const updatedAnswer = new RTCSessionDescription({
          type: "answer",
          sdp: stereo
            ? enableStereoOpus(originalAnswer.sdp)
            : originalAnswer.sdp
        });
        await peerConnection.setLocalDescription(updatedAnswer);

        await fetch(`${host}${prefix}/connections/${id}/remote-description`, {
          method: "POST",
          body: JSON.stringify(peerConnection.localDescription),
          headers: {
            "Content-Type": "application/json"
          }
        });

        await withBroadcast(peerConnection);

        return broadcast;
      } catch (error) {
        peerConnection.close();
        throw error;
      }
    };
  }
}

function enableStereoOpus(sdp) {
  return sdp.replace(/a=fmtp:111/, "a=fmtp:111 stereo=1\r\na=fmtp:111");
}

module.exports = ConnectionClient;
