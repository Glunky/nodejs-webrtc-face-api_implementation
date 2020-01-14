"use strict";

const path = require("path");

const {loadModels, detectEmotion, drawEmotion} = require("./emotion-api") // подключаем api
const MODELS_URL = path.join(__dirname, "/weights"); // указываем путь к моделям

const { createCanvas, createImageData } = require("canvas");
const {
  RTCVideoSink,
  RTCVideoSource,
  RTCAudioSink,
  RTCAudioSource,
  i420ToRgba,
  rgbaToI420
} = require("wrtc").nonstandard;

const width = 640;
const height = 480;

loadModels(MODELS_URL) // подгружаем модели

function beforeOffer(peerConnection) {
  const videoSource = new RTCVideoSource();
  const audioSource = new RTCAudioSource();
  Object.defineProperty(this, "broadcastedSource", {
    get() {
      return videoSource;
    }
  });

  const videoTrack = videoSource.createTrack();
  const audioTrack = audioSource.createTrack();
  const videoTransceiver = peerConnection.addTransceiver(videoTrack);
  const audioTransceiver = peerConnection.addTransceiver(audioTrack);
  const videoSink = new RTCVideoSink(videoTransceiver.receiver.track);
  const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);

  let lastFrame = null;
  let lastSample = null;
  let emotion = ""

  function onFrame({ frame }) {
    lastFrame = frame;
  }

  videoSink.addEventListener('frame', onFrame);

  audioSink.ondata = data => {
    lastSample = data;
  };

  // TODO(mroberts): Is pixelFormat really necessary?
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d", { pixelFormat: "RGBA24" });
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);

  const interval = setInterval(() => {
    if (lastFrame) {
      const lastFrameCanvas = createCanvas(lastFrame.width, lastFrame.height);
      const lastFrameContext = lastFrameCanvas.getContext("2d", {
        pixelFormat: "RGBA24"
      });

      const rgba = new Uint8ClampedArray(
        lastFrame.width * lastFrame.height * 4
      );
      const rgbaFrame = createImageData(
        rgba,
        lastFrame.width,
        lastFrame.height
      );
      i420ToRgba(lastFrame, rgbaFrame);

      lastFrameContext.putImageData(rgbaFrame, 0, 0);
      context.drawImage(lastFrameCanvas, 0, 0);

      // записываем эмоции
      detectEmotion(lastFrameCanvas).then(function(res){
        emotion = res
      });

    } else {
      context.fillStyle = "rgba(255, 255, 255, 0.025)";
      context.fillRect(0, 0, width, height);
    }

    if (lastSample) {
      audioSource.onData(lastSample);
    }

    // отрисовываем эмоции
    drawEmotion(emotion, context, width, height);

    const rgbaFrame = context.getImageData(0, 0, width, height);
    const i420Frame = {
      width,
      height,
      data: new Uint8ClampedArray(1.5 * width * height)
    };
    rgbaToI420(rgbaFrame, i420Frame);
    videoSource.onFrame(i420Frame);
  });

  const { close } = peerConnection;
  peerConnection.close = function() {
    clearInterval(interval);
    videoSink.stop();
    videoTrack.stop();
    return close.apply(this, arguments);
  };
}

function broadcastStream(peerConnection, broadcasted) {
  const track = broadcasted.broadcastedSource.createTrack();
  peerConnection.addTransceiver(track);
  peerConnection.addTransceiver(broadcasted.stream[1]);
  const { close } = peerConnection;
  peerConnection.close = function() {
    track.stop();
    return close.apply(this, arguments);
  };
}

module.exports = { beforeOffer, broadcastStream };
