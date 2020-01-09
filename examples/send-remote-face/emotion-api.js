"use strict"

require("@tensorflow/tfjs-node");
const tf = require("@tensorflow/tfjs");
const nodeFetch = require("node-fetch");
const fapi = require("face-api.js");

fapi.env.monkeyPatch({ fetch: nodeFetch });

const emotionsArr = {
    0: "neutral",
    1: "happy",
    2: "sad",
    3: "angry",
    4: "fearful",
    5: "disgusted",
    6: "surprised"
};

function loadModels(modelsPath){
    Promise.all([
        fapi.nets.tinyFaceDetector.loadFromDisk(modelsPath),
        fapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
        fapi.nets.faceRecognitionNet.loadFromDisk(modelsPath),
        fapi.nets.faceExpressionNet.loadFromDisk(modelsPath)
    ]).then(console.log("download models"));
}

function getEmotion(face) {
    try {
      let mostLikelyEmotion = emotionsArr[0];
      let predictionArruracy = face.expressions[emotionsArr[0]];

      for (let i = 0; i < Object.keys(face.expressions).length; i++) {
        if (
          face.expressions[emotionsArr[i]] > predictionArruracy &&
          face.expressions[emotionsArr[i]] < 1
        ) {
          mostLikelyEmotion = emotionsArr[i];
          predictionArruracy = face.expressions[emotionsArr[i]];
        }
      }
      return mostLikelyEmotion;
    } 
    
    catch (e) {
      return "";
    }
  }

async function detectEmotion(frame) {
    const frameTensor3D = tf.browser.fromPixels(frame);
    const face = await fapi.detectSingleFace(
        frameTensor3D,
        new fapi.TinyFaceDetectorOptions({ inputSize: 160 })
      ).withFaceExpressions();
    const emo = getEmotion(face);
    frameTensor3D.dispose();
    return emo;
}

function drawEmotion(emotion, context, width, height){
  context.font = "60px Sans-serif";
  context.strokeStyle = "black";
  context.lineWidth = 1;
  context.fillStyle = `rgba(${Math.round(255)}, ${Math.round(255)}, ${Math.round(255)}, 1)`;
  context.textAlign = "center";
  context.save();
  context.translate(width / 2, height);
  context.strokeText(emotion, 0, 0);
  context.fillText(emotion, 0, 0);
  context.restore();
}
  
module.exports = {loadModels, detectEmotion, drawEmotion}