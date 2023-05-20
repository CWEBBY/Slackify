console.log("Slackify:content.js, cwebby.");

const port = chrome.runtime.connect({ name: "Slackify" });
const params = new URLSearchParams(window.location.search);

function call(func, args = {}) {
    port.postMessage({ caller: "Slackify:Content", 
        function: func, args: args });
}

call("onLogin", {
    error: params.get("error"),
    appToken: params.get("code") 
});