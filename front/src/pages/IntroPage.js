import { log } from '../log'
import { html } from 'uhtml'
// import * as db from "../components/db"
// import * as jwt from "../components/jwt"

// 

window.MHR.register("IntroPage", class IntroPage extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    async enter() {

        let theHtml = html`
        <div class="w3-container">
            <h3>Welcome to the application</h3>
        </div>
        `

        this.render(theHtml)

    }

})


async function getCredentialList(backEndpoint) {
    backEndpoint = "/webauthn/creds/list"

    try {
        let response = await fetch(backEndpoint)
        if (response.ok) {
            var cards = await response.json()
        } else {
            if (response.status == 403) {
                window.MHR.gotoPage("AuthInit", { returnTo: "IntroPage" })
                return "Forbidden"
            }
            var error = await response.text()
            log.error(error)
            alert(error)
            return null
        }
    } catch (error) {
        log.error(error)
        alert(error)
        return null
    }

    console.log(cards)
    return cards

}


async function logoff() {
    var backEndpoint = "/webauthn/logoff"

    try {
        let response = await fetch(backEndpoint)
    } catch (error) {
        log.error(error)
    }

    location.reload()
    return

}
