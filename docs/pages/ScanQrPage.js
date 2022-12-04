import {
  getPlatformOS,
  getPreferredVideoDevice
} from "../chunks/chunk-RC4ORKZO.js";
import {
  log
} from "../chunks/chunk-FVTRWWP3.js";
import {
  html
} from "../chunks/chunk-65N62L2T.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/ScanQrPage.js
var testQRdata = "HC1:NC";
var testQR = {
  text: testQRdata
};
var debugging = false;
var QR_UNKNOWN = 0;
var QR_URL = 1;
var QR_MULTI = 2;
var QR_HC1 = 3;
var QR_SIOP_URL = 4;
window.MHR.register("ScanQrPage", class ScanQrPage extends window.MHR.AbstractPage {
  displayPage;
  detectionInterval = 200;
  videoElement = {};
  nativeBarcodeDetector;
  zxingReader;
  lastUsedCameraId;
  canvasElement;
  canvasSpace;
  constructor(id) {
    super(id);
    if (!("BarcodeDetector" in window)) {
      console.log("Barcode Detector is not supported by this browser.");
      this.zxingPromise = import("../chunks/esm-WYNQK35S.js");
    } else {
      console.log("Barcode Detector supported!");
      this.nativeBarcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
    }
    this.videoElement = {};
    this.canvasElement = document.createElement("canvas");
    this.canvasSpace = this.canvasElement.getContext("2d");
  }
  async enter(displayPage) {
    if (!displayPage) {
      displayPage = "DisplayHcert";
    }
    this.displayPage = displayPage;
    if (debugging) {
      await this.processQRpiece(testQR, displayPage);
      return;
    }
    if (!this.nativeBarcodeDetector) {
      let zxing = await this.zxingPromise;
      this.zxingReader = new zxing.BrowserQRCodeReader();
    }
    this.lastUsedCameraId = await this.selectCamera();
    let theHtml = html`<div class="w3-content" style="max-width:500px">
        <video style="max-width:500px" ref=${this.videoElement} oncanPlay=${() => this.canPlay()}></video>
        </div>`;
    this.render(theHtml);
    let constraints;
    if (!this.lastUsedCameraId) {
      console.log("Constraints without camera");
      constraints = {
        audio: false,
        video: {
          facingMode: "environment"
        }
      };
    } else {
      console.log("Constraints with deviceID:", this.lastUsedCameraId);
      constraints = {
        audio: false,
        video: {
          deviceId: this.lastUsedCameraId
        }
      };
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      let videoTracks = stream.getVideoTracks();
      for (let i = 0; i < videoTracks.length; i++) {
        let caps = videoTracks[i].getCapabilities();
        console.log(caps);
      }
      this.videoElement.current.setAttribute("autoplay", "true");
      this.videoElement.current.setAttribute("muted", "true");
      this.videoElement.current.setAttribute("playsinline", "true");
      this.videoElement.current.srcObject = stream;
      console.log(stream);
    } catch (error) {
      log.error("Error getting stream", error);
      window.MHR.gotoPage("ErrorPage", { title: "Error getting video stream", msg: "There was an error trying to start the camera." });
      return;
    }
  }
  async selectCamera() {
    var selectedCameraId = localStorage.getItem("selectedCamera");
    console.log("User selected camera:", selectedCameraId);
    if (!selectedCameraId) {
      selectedCameraId = this.lastUsedCameraId;
      console.log("Last used camera:", selectedCameraId);
    }
    if (!selectedCameraId && "Android" == getPlatformOS()) {
      console.log("We are in Andoid and this is the first time");
      let allVideoDevices;
      try {
        allVideoDevices = await getPreferredVideoDevice();
        console.log("Video devices in Android:", allVideoDevices);
      } catch (error) {
        log.error("Error requesting camera access", error);
      }
      if (allVideoDevices && allVideoDevices.defaultPreferredCamera) {
        selectedCameraId = allVideoDevices.defaultPreferredCamera.deviceId;
        console.log("Selected camera in Android:", selectedCameraId);
      }
      if (!selectedCameraId) {
        console.log("In Android and no selected camera");
      }
    }
    return selectedCameraId;
  }
  async canPlay() {
    console.log("Video can play, try to detect QR");
    this.videoElement.current.style.display = "block";
    this.videoElement.current.play();
    this.detectCode();
  }
  async detectCode() {
    let qrType = QR_UNKNOWN;
    let qrData;
    if (this.nativeBarcodeDetector) {
      let codes;
      try {
        codes = await this.nativeBarcodeDetector.detect(this.videoElement.current);
      } catch (error) {
        log.error(err);
        return;
      }
      if (codes.length === 0) {
        setTimeout(() => this.detectCode(), this.detectionInterval);
        return;
      }
      for (const barcode of codes) {
        console.log(barcode);
        qrData = barcode.rawValue;
        qrType = this.detectQRtype(qrData);
        if (qrType != QR_UNKNOWN) {
          break;
        }
      }
    } else {
      try {
        const result = await this.zxingReader.decodeOnceFromVideoElement(this.videoElement.current);
        qrData = result.text;
        console.log("RESULT", qrData);
      } catch (error) {
        log.error("ZXING decoding error", error);
      }
      qrType = this.detectQRtype(qrData);
    }
    if (qrType === QR_UNKNOWN) {
      setTimeout(() => this.detectCode(), this.detectionInterval);
      return;
    }
    if (qrType === QR_SIOP_URL) {
      console.log("Going to ", "SIOPSelectCredential", qrData);
      window.MHR.gotoPage("SIOPSelectCredential", qrData);
      return true;
    }
    if (qrType === QR_HC1) {
      console.log("Going to ", "DisplayHcert");
      window.MHR.gotoPage("DisplayHcert", qrData);
      return true;
    }
    if (qrType === QR_URL) {
      console.log("Going to ", "DisplayNormalQR");
      window.MHR.gotoPage("DisplayNormalQR", qrData);
      return true;
    }
  }
  async exit() {
    if (!this.videoElement.current) {
      return;
    }
    this.videoElement.current.style.display = "none";
    if (this.videoElement.current.srcObject !== void 0) {
      this.videoElement.current.srcObject.getVideoTracks().forEach((track) => {
        track.stop();
      });
    }
  }
  detectQRtype(qrData) {
    if (!qrData || !qrData.startsWith) {
      log.error("detectQRtype: data is not string");
      return QR_UNKNOWN;
    }
    if (qrData.startsWith("HC1:")) {
      return QR_HC1;
    } else if (qrData.startsWith("multi|w3cvc|")) {
      return QR_MULTI;
    } else if (qrData.startsWith("openid:")) {
      return QR_SIOP_URL;
    } else if (qrData.startsWith("https")) {
      return QR_URL;
    } else {
      return QR_UNKNOWN;
    }
  }
});
var qrScan = {
  callerPage: "",
  canvasElement: "",
  canvas: "",
  progressMessages: "",
  displayQRPage: "",
  callerType: "",
  receivedQRPieces: [],
  receivedPieces: "",
  video: "",
  myStream: ""
};
async function initiateReceiveQRScanning(_canvasElement, _qrMessageElement, _displayQRPage, _callerType) {
  var currentPage = "";
  if (window.history.state != null) {
    currentPage = window.history.state.pageName;
  }
  qrScan["callerPage"] = currentPage;
  qrScan["canvasElement"] = _canvasElement;
  qrScan["progressMessages"] = _qrMessageElement;
  qrScan["displayQRPage"] = _displayQRPage;
  qrScan["callerType"] = _callerType;
  qrScan["receivedQRPieces"] = [];
  qrScan["receivedPieces"] = /* @__PURE__ */ new Set();
  qrScan["canvas"] = qrScan["canvasElement"].getContext("2d");
  qrScan["video"] = document.createElement("video");
  qrScan["canvasElement"].hidden = true;
  qrScan["progressMessages"].innerText = "Waiting for QR .........";
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
    qrScan["myStream"] = stream;
    qrScan["video"].srcObject = stream;
    qrScan["video"].setAttribute("playsinline", true);
    qrScan["video"].play();
    requestAnimationFrame(ReceiveQRtick);
  });
}
async function ReceiveQRtick() {
  try {
    var video = qrScan["video"];
    var canvas = qrScan["canvas"];
    var canvasElement = qrScan["canvasElement"];
    var receivedPieces = qrScan["receivedPieces"];
    var receivedQRPieces = qrScan["receivedQRPieces"];
    var progressMessages = qrScan["progressMessages"];
    var myStream = qrScan["myStream"];
    var callerType = qrScan["callerType"];
    var callerPage = qrScan["callerPage"];
    var displayQRPage = qrScan["displayQRPage"];
    var currentPage = "";
    if (window.history.state != null) {
      currentPage = window.history.state.pageName;
    }
    if (currentPage != callerPage) {
      stopMediaTracks(myStream);
      return;
    }
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(ReceiveQRtick);
      return;
    }
    canvasElement.hidden = false;
    canvasElement.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    let displayWidth = video.videoWidth;
    let displayHeight = video.videoHeight;
    canvas.drawImage(video, 0, 0, displayWidth, displayHeight);
    var imageData = canvas.getImageData(
      0,
      0,
      displayWidth,
      displayHeight
    );
    try {
      var code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });
    } catch (error) {
      console.error("jsQR:", error);
    }
    if (!code) {
      requestAnimationFrame(ReceiveQRtick);
      return;
    }
    var qrType = detectQRtype(code.data);
    if (qrType == "unknown") {
      requestAnimationFrame(ReceiveQRtick);
      return;
    }
    if (qrType == "MultiJWT") {
      mylog("Scanned MultiJWT QR");
      var components = code.data.split("|");
      var total = components[2];
      var index = components[3];
      var piece = components[4];
      var total1 = total.charCodeAt(0);
      var total2 = total.charCodeAt(1);
      var index1 = index.charCodeAt(0);
      var index2 = index.charCodeAt(1);
      if (total1 < 48 || total1 > 57 || total2 < 48 || total2 > 57 || index1 < 48 || index1 > 57 || index2 < 48 || index2 > 57) {
        requestAnimationFrame(ReceiveQRtick);
        return;
      }
      if (receivedPieces.has(index)) {
        requestAnimationFrame(ReceiveQRtick);
        return;
      }
      receivedPieces.add(index);
      receivedQRPieces[+index] = piece;
      progressMessages.innerText = "Received piece: " + index;
      if (receivedPieces.size < total) {
        requestAnimationFrame(ReceiveQRtick);
        return;
      }
      stopMediaTracks(myStream);
      canvasElement.hidden = true;
      mylog("Received all pieces", receivedQRPieces);
      var jwt = receivedQRPieces.join("");
      mylog("Received jwt", jwt);
      try {
        var cred = decodeJWT(jwt);
        let currentCredential = {
          type: "w3cvc",
          encoded: jwt,
          decoded: cred
        };
        mylog("Writing current cred: ", currentCredential);
        await settingsPut("currentCredential", currentCredential);
      } catch (error) {
        myerror(error);
        progressMessages.innerText = error;
        return;
      }
      window.MHR.gotoPage(displayQRPage, { screenType: callerType });
      return;
    }
    if (qrType == "URL") {
      mylog("Scanned normal URL QR");
      stopMediaTracks(myStream);
      let targetURLRead = code.data.trim();
      if (targetURLRead.startsWith(MYSELF)) {
        const url = new URL(targetURLRead);
        let credId = url.searchParams.get("id");
        if (credId) {
          targetURLRead = ISSUER_GET_CREDENTIAL + credId;
        } else {
          credId = url.searchParams.get("pubid");
          if (credId) {
            targetURLRead = ISSUER_GET_PUBLIC_CREDENTIAL + credId;
          }
        }
      }
      await requestQRAndDisplay(targetURLRead, displayQRPage, callerType);
      return;
    }
    const HC_ISS = 1;
    const HC_IAT = 6;
    const HC_EXP = 4;
    const HC_CTI = 7;
    const HC_HCERT = -260;
    if (qrType == "HC1") {
      mylog("Scanned HC1 QR");
      let plain = await CWT.decodeHC1QR(code.data);
      console.log("CWT.decodeHC1QR", plain);
      let currentCredential = {
        type: "hcert",
        encoded: code.data,
        decoded: plain
      };
      await settingsPut("currentCredential", currentCredential);
      stopMediaTracks(myStream);
      window.MHR.gotoPage(displayQRPage, { screenType: callerType });
      return;
    }
    if (qrType == "Base64") {
      mylog("Scanned Base64 simple QR");
      let decodedQR = JSON.parse(atobUrl(code.data));
      let currentCredential = {
        type: "ukimmigration",
        encoded: code.data,
        decoded: decodedQR
      };
      await settingsPut.setItem("currentCredential", currentCredential);
      stopMediaTracks(myStream);
      window.MHR.gotoPage(displayQRPage, { screenType: callerType });
      return;
    }
  } catch (error) {
    stopMediaTracks(myStream);
    console.error(error);
    alert(`Error: ${error}`);
    window.MHR.gotoPage(homePage);
    return;
  }
}
export {
  initiateReceiveQRScanning
};
