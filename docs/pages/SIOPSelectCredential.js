import {
  log
} from "../chunks/chunk-FVTRWWP3.js";
import {
  html
} from "../chunks/chunk-65N62L2T.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/SIOPSelectCredential.js
window.MHR.register("SIOPSelectCredential", class SIOPSelectCredential extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter(qrData) {
    console.log("Inside SIOPSelectCredential:", qrData);
    if (qrData == null) {
      qrData = "No data received";
    }
    qrData = qrData.replace("openid://?", "");
    var params = new URLSearchParams(qrData);
    var redirect_uri = params.get("redirect_uri");
    var state = params.get("state");
    console.log("state", state, "redirect_uri", redirect_uri);
    var cards = await getCredentialList();
    if (cards == null) {
      let theHtml2 = html`
            <div class="w3-panel w3-margin w3-card w3-center w3-round color-error">
                <p>Error retrieving credentials from the server</p>
            </div>
            `;
      this.render(theHtml2);
      return;
    }
    if (cards == "Forbidden") {
      return;
    }
    var numCards = cards.length;
    var message = "credential";
    if (numCards > 1) {
      message = "credentials";
    }
    console.log(cards[0]);
    let theHtml = html`
            <div class="w3-content w3-margin-top">
        
            <div class="w3-row-padding">
            <h4>You have ${numCards} ${message}</h4>

                ${cards.map(
      (card) => {
        var thehref = "https://verifier.mycredential.eu/wallet/api/v1/sendcredential/?id=" + card.id + "&redirect_uri=" + redirect_uri + "&state=" + state;
        return html`
                    <div class="w3-half w3-container w3-margin-bottom">
                        <div class="w3-card-4">
                            <div class=" w3-container w3-margin-bottom color-primary">
                                <h4>${card.id}</h4>
                            </div>

                            <div class="w3-container w3-padding-16">
                                <a href=${() => sendCredential(thehref)} class="btn-primary">Send</a>
                            </div>

                        </div>
                    </div>`;
      }
    )}               
            
            </div>
            
        </div>
        `;
    this.render(theHtml);
  }
});
async function getCredentialList(backEndpoint) {
  backEndpoint = "https://verifier.mycredential.eu/issuer/api/v1/allcredentials";
  try {
    let response = await fetch(backEndpoint, {
      mode: "cors"
    });
    if (response.ok) {
      var cards = await response.json();
    } else {
      if (response.status == 403) {
        alert.apply("error 403");
        window.MHR.goHome();
        return "Error 403";
      }
      var error = await response.text();
      log.error(error);
      alert(error);
      return null;
    }
  } catch (error2) {
    log.error(error2);
    alert(error2);
    return null;
  }
  console.log(cards);
  return cards;
}
async function sendCredential(backEndpoint) {
  try {
    let response = await fetch(backEndpoint, {
      mode: "cors"
    });
    if (response.ok) {
      var result = await response.text();
    } else {
      if (response.status == 403) {
        alert.apply("error 403");
        window.MHR.goHome();
        return "Error 403";
      }
      var error = await response.text();
      log.error(error);
      alert(error);
      window.MHR.goHome();
      return null;
    }
  } catch (error2) {
    log.error(error2);
    alert(error2);
    return null;
  }
  console.log(result);
  window.MHR.goHome();
  return;
}
