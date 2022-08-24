import "../chunks/chunk-FVTRWWP3.js";
import "../chunks/chunk-K33A5WJ7.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/MicroWallet.js
window.MHR.register("MicroWallet", class MicroWallet extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter() {
    let html2 = this.html;
    let params = new URLSearchParams(document.location.search.substring(1));
    let eudcc = params.get("eudcc");
    if (eudcc !== null) {
      eudcc = atob(eudcc);
      console.log("EUDCC received:", eudcc);
      await window.MHR.gotoPage("AskUserToStoreQR", eudcc);
      return;
    }
    let qrContent = window.localStorage.getItem("MYEUDCC");
    if (qrContent !== null) {
      await window.MHR.gotoPage("DisplayMyHcert", qrContent);
      return;
    }
    this.render(html2`
            <div id="hcertFailed" class="w3-panel bkg-fail">
                <h2>${T("There is no certificate.")}</h2>
            </div>
       `);
    return;
  }
});
