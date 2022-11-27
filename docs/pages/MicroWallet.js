import "../chunks/chunk-FVTRWWP3.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/MicroWallet.js
window.MHR.register("MicroWallet", class MicroWallet extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter() {
    let html = this.html;
    let params = new URLSearchParams(document.location.search.substring(1));
    let eudcc = params.get("eudcc");
    let scope = params.get("scope");
    if (eudcc !== null) {
      eudcc = atob(eudcc);
      console.log("EUDCC received:", eudcc);
      await window.MHR.gotoPage("AskUserToStoreQR", eudcc);
      return;
    }
    if (scope !== null) {
      var response_type = params.get("response_type");
      var response_mode = params.get("response_mode");
      var client_id = params.get("client_id");
      var redirect_uri = params.get("redirect_uri");
      var state = params.get("state");
      var nonce = params.get("nonce");
      let theHtml = html`
            <div class="w3-container">
                <p>Welcome to the application</p>
                <p>scope: ${scope}</p>
                <p>response_type: ${response_type}</p>
                <p>response_mode: ${response_mode}</p>
                <p>client_id: ${client_id}</p>
                <p>redirect_uri: ${redirect_uri}</p>
                <p>state: ${state}</p>
                <p>nonce: ${nonce}</p>
            </div>
            `;
      this.render(theHtml);
      return;
    }
    let qrContent = window.localStorage.getItem("MYEUDCC");
    if (qrContent !== null) {
      await window.MHR.gotoPage("DisplayMyHcert", qrContent);
      return;
    }
    this.render(html`
            <div id="hcertFailed" class="w3-panel bkg-fail">
                <h2>${T("There is no certificate.")}</h2>
            </div>
       `);
    return;
  }
});
