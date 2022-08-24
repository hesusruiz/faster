{{define "index"}}
<!DOCTYPE html>
<html lang="en">

<head>
    <script>
        // Set here the default home page for the app, before loading app.js
        window.homePage = "{{.Homepage}}"
        // Configure the menu items, with entries like:
        //    {page:"NameOfPage", text:"Text in menu item", params: object to pass to page}
        window.menuItems = [
            {{- range $p := .MenuItems}}
            {page:"{{$p.page}}", text:"{{$p.text}}", params: {{$p.params}}},
            {{- end}}
        ]
    </script>
    <!-- Load the application -->
    <link rel="stylesheet" href="./app.css" />
    <script type="module" src="./app.js"></script>

    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Private Verifiable Credentials" />
    <meta name="theme-color" content="#919597">
    <title>Private Verifiable Credentials</title>
    <meta itemprop="name" content="Private Verifiable Credentials">
    <meta itemprop="description" content="Private Verifiable Credentials">
    <!-- Facebook Meta Tags -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Private Verifiable Credentials">
    <meta property="og:description"
        content="Privacy-focused Wallet for Verifiable Credentials">
    <link rel="manifest" href="./manifest.webmanifest">

    <link rel="icon" type="image/png" href="./favicon.ico" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="Private Verifiable Credentials" />
    <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
    <style>
    .loader {
        margin: auto;
        z-index: 1;
        width: 100px;
        height: 100px;
        border: 16px solid #f3f3f3;
        border-radius: 50%;
        border-top: 16px solid #919597;
        -webkit-animation: spin 2s linear infinite;
        animation: spin 2s linear infinite;
    }
    @-webkit-keyframes spin {
        0% {-webkit-transform: rotate(0deg);}
        100% {-webkit-transform: rotate(360deg);}
    }
    @keyframes spin {
        0% {transform: rotate(0deg);}
        100% {transform: rotate(360deg);}
    }
    </style>

</head>

<body class="w3-content">

<header>
</header>

<splash-screen id="SplashScreen" style="padding: 25px 15px 50px 15px;text-align: center;">
    <div style="padding: 16px 0px;">
        <div class="loader" style="margin: auto;"></div>
    </div>
</splash-screen>

<main>
</main>

<footer>
</footer>

</body>

</html>
{{end}}