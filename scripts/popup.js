console.log("Slackify:popup.js, cwebby.");

// Vars
let saveDirty = false;
let saveButton = document.getElementById("saveButton");

let loginButton = document.getElementById("loginButton");
let loggedInDisplay = document.getElementById("loggedInPopup");

let playerLabel = document.getElementById("playerLabel");
let playerProgressBar = document.getElementById("playerProgressBar");
let playerProgressLabel = document.getElementById("playerProgressLabel");
let playerDurationLabel = document.getElementById("playerDurationLabel");

let emojisTextArea = document.getElementById("emojisTextarea");
emojisTextArea.addEventListener('keydown', () => saveDirty = true);
let formatsTextArea = document.getElementById("formatsTextarea");
formatsTextArea.addEventListener('keydown', () => saveDirty = true);
let userTokenTextArea = document.getElementById("userTokenTextArea");
userTokenTextArea.addEventListener('keydown', () => saveDirty = true);

loginButton.addEventListener('click', args => call("login"));
saveButton.addEventListener('click', args => {
    call("save", { 
        userToken: userTokenTextArea.value,
        emojis: emojisTextArea.value.split('\n'),
        formats: formatsTextArea.value.split('\n') })
    saveDirty = false;
});

const port = chrome.runtime.connect({ name: "Slackify" });

// Functions / Callbacks
port.onMessage.addListener(message => {
    if (message.caller != "Slackify:Background")
        return;

    var args = message.args;

    loggedInDisplay.style.display = args.isLoggedIn ? "block" : "none";
    loginButton.style.display = args.isLoggedIn ? "none" : "block";

    if (!args.isLoggedIn) 
        return;

    if (!saveDirty)
    {
        userTokenTextArea.value = args.userToken;

        var formatString = "";
        for (var i = 0; i < args.formats.length; i++)
        { if (i > 0) { formatString += '\n'; }
            formatString += args.formats[i]; }
        formatsTextArea.value = formatString;
    
        var emojiString = "";
        for (var i = 0; i < args.emojis.length; i++)
        { if (i > 0) { emojiString += '\n'; }
            emojiString += args.emojis[i]; }
        emojisTextArea.value = emojiString;
    }

    playerLabel.innerText = args.label;
    playerProgressLabel.innerText = args.progressText;
    playerProgressBar.style.width = (args.progressValue * 100) + "%";
    playerDurationLabel.innerText = args.duration;
});

function call(func, args = {}) {
    port.postMessage({ caller: "Slackify:Popup", 
        function: func, args: args });
}

// Init
call("tick", {
    enabled: false,
});