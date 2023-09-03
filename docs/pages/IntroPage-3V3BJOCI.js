import {
  html
} from "../chunks/chunk-65N62L2T.js";
import {
  log
} from "../chunks/chunk-FVTRWWP3.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/IntroPage.js
window.MHR.register("IntroPage", class IntroPage extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter() {
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
      (card) => html`
                    <div class="w3-panel w3-border w3-wordbreak">
                    <p class="w3-medium">Unique ID: ${card.ID}</p>
                    <p class="w3-medium">Public key: ${card.PublicKey}</p>
                    </a>`
    )}               
            
            </div>
            
            <div class="w3-center">
                <btn-primary onclick='${() => logoff()}'>
                    ${T("Logoff")}
                </btn-primary>
            </div>
        </div>
        `;
    this.render(theHtml);
  }
});
async function getCredentialList(backEndpoint) {
  backEndpoint = "/webauthn/creds/list";
  try {
    let response = await fetch(backEndpoint);
    if (response.ok) {
      var cards = await response.json();
    } else {
      if (response.status == 403) {
        window.MHR.gotoPage("AuthInit", { returnTo: "IntroPage" });
        return "Forbidden";
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
async function logoff() {
  var backEndpoint = "/webauthn/logoff";
  try {
    let response = await fetch(backEndpoint);
  } catch (error) {
    log.error(error);
  }
  location.reload();
  return;
}
