import "../chunks/chunk-FVTRWWP3.js";
import {
  html
} from "../chunks/chunk-65N62L2T.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/IntroPage.js
window.MHR.register("IntroPage", class IntroPage extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter() {
    let theHtml = html`
        <div class="w3-container">
            <h3>Welcome to the application</h3>
        </div>
        `;
    this.render(theHtml);
  }
});
