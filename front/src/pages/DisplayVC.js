import { log } from '../log'

let gotoPage = window.MHR.gotoPage
let goHome = window.MHR.goHome

window.MHR.register("LoadAndSaveQRVC", class LoadAndSaveQRVC extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    async enter(qrData) {
        let html = this.html

        // We should have received a URL that was scanned as a QR code.
        // Perform some sanity checks on the parameter
        if (qrData == null || !qrData.startsWith) {
            log.error("The scanned QR does not contain a valid URL")
            gotoPage("ErrorPage", {"title": "No data received", "msg": "The scanned QR does not contain a valid URL"})
            return
        }

        let theHtml = html`
        <div class="container">

            <pre><code class="language-json">
            ${qrData}
            </code></pre>

        </div>
        `

        this.render(theHtml)
    }

})
