import { log } from '../log'
import { html } from 'uhtml'
// import * as db from "../components/db"
// import * as jwt from "../components/jwt"

// 

window.MHR.register("SIOPSelectCredential", class SIOPSelectCredential extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    async enter(qrData) {
        console.log("Inside SIOPSelectCredential:", qrData)
        if (qrData == null) {
            qrData = "No data received"
        }

        qrData = qrData.replace("openid://?", "")
        var params = new URLSearchParams(qrData)
        var redirect_uri = params.get("redirect_uri")
        var state = params.get("state")
        console.log("state", state, "redirect_uri", redirect_uri)

        var cards = await getCredentialList()
        if (cards == null) {
            let theHtml = html`
            <div class="w3-panel w3-margin w3-card w3-center w3-round color-error">
                <p>Error retrieving credentials from the server</p>
            </div>
            `;
            this.render(theHtml)
            return             
        }

        if (cards == "Forbidden") {
            return            
        }

        var numCards = cards.length
        var message = "credential"
        if (numCards > 1) {
            message = "credentials"
        }

        console.log(cards[0])
        let theHtml = html`
            <div class="w3-content w3-margin-top">
        
            <div class="w3-row-padding">
            <h4>You have ${numCards} ${message}</h4>

                ${cards.map(
                    (card) => {
                        var thehref="https://verifier.mycredential.eu/wallet/api/v1/sendcredential/?id="+
                    card.id+"&redirect_uri="+redirect_uri+"&state="+state
                    return html`
                    <div class="w3-half w3-container w3-margin-bottom">
                        <div class="w3-card-4">
                            <div class=" w3-container w3-margin-bottom color-primary">
                                <h4>${card.id}</h4>
                            </div>

                            <div class="w3-container w3-padding-16">
                                <a href=${thehref} class="btn-primary">Send</a>
                            </div>

                        </div>
                    </div>`

                    }

                )}               
            
            </div>
            
        </div>
        `;

        this.render(theHtml)

    }

})


async function getCredentialList(backEndpoint) {

    backEndpoint = "https://verifier.mycredential.eu/issuer/api/v1/allcredentials"

    try {
        let response = await fetch(backEndpoint, {
            mode: "cors",
        })
        if (response.ok) {
            var cards = await response.json()
        } else {
            if (response.status == 403) {
                alert.apply("error 403")
                window.MHR.goHome()
                return "Error 403"
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


// function Card2(content) {
    //     return html`
    // <div class="w3-col">
    //     <div class="w3-margin-bottom w3-card-4 w3-round-large">
    
    //         <div class="w3-cell-row">
    
    //             <div class="w3-cell w3-container color-primary w3-round-top-left" style="width:70%">
    //                 <div>Logo</div>
    //             </div>
    
    //             <div class="w3-cell w3-container">
    
    //                 <div class="w3-cell-row">
    //                     <div class="w3-cell w3-tiny w3-monospace w3-text-grey">
    //                         <div class="w3-tiny w3-monospace w3-text-grey">FLIGHT</div>
    //                         <div class="w3-small w3-monospace">IB3205</div>
    //                     </div>
    //                     <div class="w3-cell w3-tiny w3-monospace w3-text-grey">
    //                         <div class="w3-tiny w3-monospace w3-text-grey">DATE</div>
    //                         <div class="w3-small w3-monospace">28JUN</div>
    //                     </div>
    //                 </div>
    
    //             </div>
    
    //         </div>
    
    
    //         <div class="w3-cell-row">
    //             <div class="w3-cell w3-center" style="width:40%">
    //                 <div class="w3-xlarge">SOURCE</div>
    //             </div>
    //             <div class="w3-cell w3-center" style="width:10%">
    //                 <div>Logo</div>
    //             </div>
    //             <div class="w3-cell w3-center" style="width:40%">
    //                 <div>DEST</div>
    //             </div>
    //         </div>
    
    //         <div class="w3-cell-row">
    //             <div class="w3-container w3-large">${content.encoded}</div>
    //         </div>
    
    
    //         <div class="w3-cell-row">
    //             <div class="w3-container w3-large">&#128712;</div>
    //         </div>
    
    
    //     </div>
    // </div>`
    // }
    