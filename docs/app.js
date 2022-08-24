import {
  log
} from "./chunks/chunk-FVTRWWP3.js";
import {
  html,
  render
} from "./chunks/chunk-K33A5WJ7.js";
import "./chunks/chunk-MRZMPRY2.js";

// front/src/i18n/translations.js
var translations = {
  "$intro01": {
    "en": "This application allows the verification of COVID certificates issued by EU Member States and also certificates issued by the UK Government with the same format as the EU Digital COVID Certificate",
    "es": "Esta aplicaci\xF3n permite la verificaci\xF3n de certificados COVID emitidos por los Estados Miembro de la UE y tambi\xE9n los certificados emitidos por el Reino Unido con el mismo formato que el Certificado COVID Digital de la UE",
    "ca": "Aquesta aplicaci\xF3 permet la verificaci\xF3 dels certificats COVID emesos pels Estats membres de la UE i tamb\xE9 els certificats emesos pel Regne Unit en el mateix format que el Certificat COVID digital de la UE",
    "fr": "Cette application permet de v\xE9rifier les certificats COVID \xE9mis par les \xC9tats membres de l'UE, ainsi que les certificats \xE9mis par le gouvernement britannique sous le m\xEAme format que le certificat COVID num\xE9rique de l'UE.",
    "de": "Diese Anwendung erm\xF6glicht die \xDCberpr\xFCfung von COVID-Zertifikaten, die von EU-Mitgliedstaaten ausgestellt wurden, sowie von Zertifikaten, die von der britischen Regierung ausgestellt wurden und dasselbe Format wie das digitale COVID-Zertifikat der EU haben.",
    "it": "Questa applicazione consente di verificare i certificati COVID rilasciati dagli stati membri dell'UE nonch\xE9 i certificati rilasciati dal governo del Regno Unito con lo stesso formato del certificato digitale COVID UE"
  },
  "EU Digital COVID Credential Verifier": {
    "es": "Verificador de Credenciales COVID",
    "ca": "Verificador de Credencials COVID",
    "fr": "Outil de v\xE9rification num\xE9rique des justificatifs COVID de l'UE",
    "de": "Digitale COVID-Anmeldeinformations\xFCberpr\xFCfung in der EU",
    "it": "Strumento di verifica del certificato digitale COVID UE"
  }
};

// front/src/i18n/tr.js
var preferredLanguage = "ca";
var l = localStorage.getItem("preferredLanguage");
if (l) {
  preferredLanguage = l;
}
window.preferredLanguage = preferredLanguage;
function T(key) {
  if (window.preferredLanguage === "en" && key.charAt(0) != "$") {
    return key;
  }
  let entry = translations[key];
  if (entry === void 0) {
    return key;
  }
  let translated = entry[window.preferredLanguage];
  if (translated === void 0) {
    return key;
  }
  return translated;
}
window.T = T;

// front/src/app.js
var parsedUrl = new URL(import.meta.url);
var fullPath = parsedUrl.pathname;
console.log(fullPath);
var basePath = fullPath.replace("/app.js", "");
console.log(basePath);
var pageModules = {
  "AskUserToStoreQR": "/pages/AskUserToStoreQR.js",
  "AuthInit": "/pages/AuthInit.js",
  "DisplayHcert": "/pages/DisplayHcert.js",
  "DisplayMyHcert": "/pages/DisplayMyHcert.js",
  "DisplayNormalQR": "/pages/DisplayNormalQR.js",
  "DisplayQR": "/pages/DisplayQR.js",
  "ErrorPage": "/pages/ErrorPage.js",
  "IntroPage": "/pages/IntroPage.js",
  "LogsPage": "/pages/LogsPage.js",
  "MicroWallet": "/pages/MicroWallet.js",
  "Page404": "/pages/Page404.js",
  "PrivacyPolicy": "/pages/PrivacyPolicy.js",
  "SWNotify": "/pages/SWNotify.js",
  "ScanQrPage": "/pages/ScanQrPage.js",
  "SelectCamera": "/pages/SelectCamera.js",
  "SelectLanguage": "/pages/SelectLanguage.js",
  "TermsOfUse": "/pages/TermsOfUse.js"
};
var homePage = window.homePage;
if (!homePage) {
  throw "No homePage was set.";
}
var name404 = "Page404";
var pages = /* @__PURE__ */ new Map();
function route(pageName, classInstance) {
  pages.set(pageName, classInstance);
}
async function goHome() {
  if (homePage != void 0) {
    await gotoPage(homePage);
  }
}
async function gotoPage(pageName, pageData) {
  console.log("Inside gotoPage:", pageName);
  var pageFunction = pageModules[pageName];
  if (!pageFunction) {
    log.error("Target page does not exist: ", pageName);
    pageData = pageName;
    pageName = name404;
    await import(pageModules[pageName]);
  }
  await import(pageModules[pageName]);
  window.history.pushState(
    { pageName, pageData },
    `${pageName}`
  );
  await processPageEntered(pageName, pageData, false);
}
async function processPageEntered(pageName, pageData, historyData) {
  try {
    for (let [name, classInstance] of pages) {
      classInstance.domElem.style.display = "none";
      if (name !== pageName && classInstance.exit) {
        await classInstance.exit();
      }
    }
  } catch (error) {
    log.error("Trying to call exit", error);
    return;
  }
  let targetPage = pages.get(pageName);
  if (targetPage === void 0) {
    pageData = pageName;
    targetPage = pages.get(name404);
  }
  window.scrollTo(0, 0);
  try {
    if (targetPage.enter) {
      await targetPage.enter(pageData, historyData);
    } else {
      targetPage.style.display = "block";
    }
  } catch (error) {
    log.error("Calling enter()", error);
    return;
  }
}
window.addEventListener("popstate", async function(event) {
  var state = event.state;
  if (state == null) {
    return;
  }
  var pageName = state.pageName;
  var pageData = state.pageData;
  await processPageEntered(pageName, pageData, true);
});
async function getAndUpdateVersion() {
  let version = "1.1.1";
  window.appVersion = version;
  window.localStorage.setItem("VERSION", version);
  console.log("Version:", version);
  return;
}
window.addEventListener("DOMContentLoaded", async (event) => {
  console.log("DOMContentLoaded");
  getAndUpdateVersion();
  await goHome();
  for (const path in pageModules) {
    import(pageModules[path]);
  }
});
var INSTALL_SERVICE_WORKER = true;
window.addEventListener("load", async (event) => {
  console.log("load");
  if (true) {
    console.log("In development");
    INSTALL_SERVICE_WORKER = false;
  } else {
    console.log("In production");
  }
  if (INSTALL_SERVICE_WORKER && "serviceWorker" in navigator) {
    const { Workbox } = await import("./chunks/workbox-window.prod.es5-G5FXTEZE.js");
    const wb = new Workbox("./sw.js");
    wb.addEventListener("message", (event2) => {
      if (event2.data.type === "CACHE_UPDATED") {
        const { updatedURL } = event2.data.payload;
        console.log(`A newer version of ${updatedURL} is available!`);
      }
    });
    wb.addEventListener("activated", async (event2) => {
      if (event2.isUpdate) {
        console.log("Service worker has been updated.", event2);
        await performAppUpgrade(true);
      } else {
        console.log("Service worker has been installed for the first time.", event2);
        await performAppUpgrade(false);
      }
    });
    wb.addEventListener("waiting", (event2) => {
      console.log(
        `A new service worker has installed, but it can't activateuntil all tabs running the current version have fully unloaded.`
      );
    });
    wb.register();
  }
});
async function performAppUpgrade(isUpdate) {
  console.log("Performing Upgrade");
  gotoPage("SWNotify", { isUpdate });
}
function T2(e) {
  if (window.T) {
    return window.T(e);
  }
  return e;
}
function resetAndGoHome(e) {
  HeaderBar(false);
  if (window.MHR.goHome) {
    goHome();
  }
}
function HeaderBar(menu = false) {
  let header = document.querySelector("header");
  var subMenu = html``;
  var flag = !menu;
  if (menu) {
    subMenu = html`
        <div id="mainmenu" class="w3-bar-block w3-card color-medium">
            ${window.menuItems.map(
      ({ page, params, text }) => html`<a href="#" class="w3-bar-item w3-button" onclick=${() => {
        HeaderBar();
        gotoPage(page, params);
      }}>${text}</a>`
    )}
        </div>
        `;
  }
  var fullHB = html`
<div class="w3-bar w3-card w3-large color-primary">
    <a class="w3-bar-item w3-btn" onclick=${() => resetAndGoHome()}>
        <img style="height:1.5em; margin-bottom:5px" src="/evidencesmall.png" alt="EvidenceLedger logo">
    </a>
    <div class="w3-bar-item">Privacy Wallet</div>
    <a class="w3-bar-item w3-btn w3-right" onclick=${() => HeaderBar(flag)}>☰</a>
</div>

${subMenu}    
`;
  render(header, fullHB);
  return;
}
function ErrorPanel(title, message) {
  let theHtml = html`
    <div class="w3-container w3-padding-64">
        <div class="w3-card-4 w3-center">
    
            <header class="w3-container w3-center color-primary">
                <h3>${title}</h3>
            </header>
    
            <div class="w3-container">
                <p>${message}</p>
                <p>${T2("Please click Accept to refresh the page.")}</p>
            </div>
            
            <div class="w3-container w3-center w3-padding">
                <btn-primary onclick=${() => window.location.reload()}>${T2("Accept")}</btn-primary>        
            </div>

        </div>
    </div>
    `;
  return theHtml;
}
var AbstractPage = class {
  html;
  domElem;
  pageName;
  constructor(id) {
    if (!id) {
      throw "A page name is needed";
    }
    this.html = html;
    this.domElem = document.createElement("page");
    this.pageName = id;
    this.domElem.id = id;
    route(this.pageName, this);
    this.domElem.style.display = "none";
    var mainElem = document.querySelector("main");
    if (mainElem) {
      mainElem.appendChild(this.domElem);
    }
    console.log("Page constructor:", id);
  }
  render(theHtml) {
    let elem = document.getElementById("SplashScreen");
    if (elem) {
      elem.style.display = "none";
    }
    this.domElem.style.display = "block";
    HeaderBar();
    render(this.domElem, theHtml);
  }
};
function register(pageName, classDefinition) {
  let instance = new classDefinition(pageName);
}
window.MHR = {
  route,
  goHome,
  gotoPage,
  AbstractPage,
  register,
  ErrorPanel
};
