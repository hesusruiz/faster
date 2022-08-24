import {
  error_default,
  ok_default,
  warning_default
} from "../chunks/chunk-OXK36FYG.js";
import {
  CWT,
  verifyHcert
} from "../chunks/chunk-GJUWSDQ3.js";
import {
  log
} from "../chunks/chunk-FVTRWWP3.js";
import {
  html
} from "../chunks/chunk-K33A5WJ7.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/DisplayMyHcert.js
window.MHR.register("DisplayMyHcert", class DisplayMyHcert extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter(qrContent) {
    qrContent = window.localStorage.getItem("MYEUDCC");
    if (qrContent == null) {
      this.render(html`
            <div id="hcertFailed" class="w3-panel bkg-fail">
                <h2>${T("There is no certificate.")}</h2>
            </div>
            `);
      return;
    }
    let hcert = void 0;
    let verified = false;
    let thehtml = "";
    try {
      hcert = await CWT.decodeHC1QR(qrContent, true);
      verified = hcert[3];
    } catch (error) {
      log.error("Error verifying credential", error);
      this.render(this.renderGeneralError(error));
      return;
    }
    let verification = {
      result: "OK",
      message: T("The certificate is valid.")
    };
    if (verified === false) {
      verification.result = "ERROR";
      verification.message = T("Signature validation failed. The certificate is not valid.");
    } else if (verified === "PRE") {
      verification.result = "WARNING";
      verification.message = T("$warningmsg");
    }
    console.log(verification);
    if (verified === true || verified === "PRE") {
      console.log("Additional verifications");
      verified = verifyHcert(hcert);
      console.log(verified);
      if (verified != true) {
        verification.result = "ERROR", verification.message = T(verified);
      }
    }
    console.log(verification);
    try {
      thehtml = this.renderDetail(hcert, verification);
    } catch (error) {
      log.error("Error rendering credential", error);
      this.render(this.renderGeneralError(error));
      return;
    }
    let fullPage = html`
        ${thehtml}
        <div class="sect-white">
            <btn-primary @click=${() => window.MHR.gotoPage("DisplayQR")}>
            ${T("Display QR")}</btn-primary>
        </div>
        `;
    this.render(fullPage);
  }
  renderGeneralError(error) {
    let html2 = this.html;
    return html2`
            <div id="hcertFailed" class="w3-panel bkg-fail">
                <h3>Failed!</h3>
                <p>The credential has an invalid format.</p>
            </div>
            `;
  }
  renderDetail(cred, verification) {
    let html2 = this.html;
    let payload = cred[1];
    let title = "Validated";
    let image = ok_default;
    let color = "bkg-success";
    if (verification.result === "WARNING") {
      title = "Warning";
      image = warning_default;
      color = "bkg-warning";
    } else if (verification.result === "ERROR") {
      title = "Not Validated";
      image = error_default;
      color = "bkg-error";
    }
    let thehtml = html2`
            <div class="container">

                <div id="hcertWarning" class=${`w3-panel ${color}`}>
                    <img src=${image}  alt="" />
                    <h3>${T(title)}</h3>
                    <p>${verification.message}</p>
                </div>

                <div class="section">
                    <div class="subsection">
                        <div class="etiqueta">${T("Surname and forename")}</div>
                        <div class="valor h4">${payload.fullName}</div>
                    </div>
                    <div class="subsection">
                        <div class="etiqueta">${T("Date of birth")}</div>
                        <div class="valor h4">${payload.dateOfBirth}</div>
                    </div>
                </div>
           
            </div>
        `;
    return thehtml;
  }
});
