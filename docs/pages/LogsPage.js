import {
  log
} from "../chunks/chunk-FVTRWWP3.js";
import "../chunks/chunk-K33A5WJ7.js";
import "../chunks/chunk-MRZMPRY2.js";

// front/src/pages/LogsPage.js
function shortDate(timestamp) {
  let date = new Date(timestamp);
  return `${date.toISOString()}`;
}
window.MHR.register("LogsPage", class LogsPage extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  enter() {
    let html2 = this.html;
    let items = [];
    for (let i = 0; i < log.num_items(); i++) {
      items.push(log.item(i));
    }
    let theHtml = html2`
        <div class="w3-container">
            <h2>${T("Technical logs")}</h2>
        </div>

        <ul class="w3-ul">
            ${items.map(
      ({ timestamp, desc }, i) => html2`<li>${shortDate(timestamp)}-${desc}</li>`
    )}
        </ul>

        `;
    this.render(theHtml);
  }
});
