"use strict";

// require("@tensorflow/tfjs-node");
// const tf = require("@tensorflow/tfjs");
const nodeFetch = require("node-fetch");
// const fapi = require("face-api.js");
const path = require("path");
const { createCanvas, createImageData } = require("canvas");
const {
  RTCVideoSink,
  RTCVideoSource,
  i420ToRgba,
  rgbaToI420
} = require("wrtc").nonstandard;

// fapi.env.monkeyPatch({ fetch: nodeFetch });
// const MODELS_URL = path.join(__dirname, "/weights");

const width = 640;
const height = 480;

// Promise.all([
//   fapi.nets.tinyFaceDetector.loadFromDisk(MODELS_URL),
//   fapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL),
//   fapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL),
//   fapi.nets.faceExpressionNet.loadFromDisk(MODELS_URL)
// ]);

function beforeOffer(peerConnection) {
  const source = new RTCVideoSource();
  const track = source.createTrack();
  const transceiver = peerConnection.addTransceiver(track);
  const sink = new RTCVideoSink(transceiver.receiver.track);

  let lastFrame = null;

  function onFrame({ frame }) {
    lastFrame = frame;
  }

  sink.addEventListener("frame", onFrame);

  // TODO(mroberts): Is pixelFormat really necessary?
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d", { pixelFormat: "RGBA24" });
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  // const emotionsArr = {
  //   0: "neutral",
  //   1: "happy",
  //   2: "sad",
  //   3: "angry",
  //   4: "fearful",
  //   5: "disgusted",
  //   6: "surprised"
  // };
  // async function detectEmotion(lastFrameCanvas) {
  //   const frameTensor3D = tf.browser.fromPixels(lastFrameCanvas);
  //   const face = await fapi
  //     .detectSingleFace(
  //       frameTensor3D,
  //       new fapi.TinyFaceDetectorOptions({ inputSize: 160 })
  //     )
  //     .withFaceExpressions();
  //   //console.log(face);
  //   const emo = getEmotion(face);
  //   frameTensor3D.dispose();
  //   return emo;
  // }
  // function getEmotion(face) {
  //   try {
  //     let mostLikelyEmotion = emotionsArr[0];
  //     let predictionArruracy = face.expressions[emotionsArr[0]];

  //     for (let i = 0; i < Object.keys(face.expressions).length; i++) {
  //       if (
  //         face.expressions[emotionsArr[i]] > predictionArruracy &&
  //         face.expressions[emotionsArr[i]] < 1
  //       ) {
  //         mostLikelyEmotion = emotionsArr[i];
  //         predictionArruracy = face.expressions[emotionsArr[i]];
  //       }
  //     }
  //     //console.log(mostLikelyEmotion);
  //     return mostLikelyEmotion;
  //   } catch (e) {
  //     return "";
  //   }
  // }
  // let emotion = "";
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

      // detectEmotion(lastFrameCanvas).then(function(res) {
      //   emotion = res;
      // });
    } else {
      context.fillStyle = "rgba(255, 255, 255, 0.025)";
      context.fillRect(0, 0, width, height);
    }

    // if (emotion != "") {
    //   context.font = "60px Sans-serif";
    //   context.strokeStyle = "black";
    //   context.lineWidth = 1;
    //   context.fillStyle = `rgba(${Math.round(255)}, ${Math.round(
    //     255
    //   )}, ${Math.round(255)}, 1)`;
    //   context.textAlign = "center";
    //   context.save();
    //   context.translate(width / 2, height);
    //   context.strokeText(emotion, 0, 0);
    //   context.fillText(emotion, 0, 0);
    //   context.restore();
    // }

    const rgbaFrame = context.getImageData(0, 0, width, height);
    const i420Frame = {
      width,
      height,
      data: new Uint8ClampedArray(1.5 * width * height)
    };
    rgbaToI420(rgbaFrame, i420Frame);
    source.onFrame(i420Frame);
  });

  const { close } = peerConnection;
  peerConnection.close = function() {
    clearInterval(interval);
    sink.stop();
    track.stop();
    return close.apply(this, arguments);
  };
}

module.exports = { beforeOffer };
