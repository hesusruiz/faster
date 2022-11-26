import {
  html
} from "../chunks/chunk-65N62L2T.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/DisplayNormalQR.js
window.MHR.register("DisplayNormalQR", class DisplayNormalQR extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  enter(qrData) {
    if (qrData == null) {
      qrData = "No data received";
    }
    let isURL = false;
    if (qrData.startsWith("https://") || qrData.startsWith("http://")) {
      isURL = true;
    }
    let theHtml = html`
        <div class="w3-container w3-center w3-padding-32">
            <h3>Received QR</h3>
            <p class="w3-large" style="word-break: break-all;">${qrData}</p>
        
            <div class="w3-section">

                <a href="javascript:void(0)" @click=${() => window.history.back()} class="w3-btn color-primary
                    w3-large w3-round-large">Back</a>
    
                ${isURL ? html`<a href="${qrData}" class="w3-btn color-primary
                    w3-large w3-round-large">Go to site</a>` : html``}
                
            </div>
        </div>
        `;
    this.render(theHtml);
  }
});
