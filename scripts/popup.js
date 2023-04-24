console.log("Slackify:popup.js, cwebby.");

let messageBox = document.getElementById("messageBox");
let messageBoxText = document.getElementById("messageBoxText");

const port = chrome.runtime.connect({ name: "Slackify" });
port.onMessage.addListener(message => {
    if (message["caller"] == "Slackify") 
        { EVENT_HANDLERS[message.event](message.args); }
    else { console.log("Unhandled event: " + message.event); }
});

const EVENT_HANDLERS = {
    "OnAuthenticationFailed": args => {
        messageBox.style.display = "block";
        messageBoxText.innerText = "Error.";
    },
}

const params = new URLSearchParams(window.location.search);
port.postMessage({ caller: "Slackify", event: "OnAuthentication",
    args: { appToken: params.get("code"), error: params.get("error") }
});