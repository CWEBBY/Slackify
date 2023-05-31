console.log("Slackify:popup.js, cwebby.");

// Imports 
import { pad } from "./utils.js";

// Vars
let state;
let time = new Date();

let saveDirty = false;
let saveButton = document.getElementById("saveButton");

let loadingLabel = document.getElementById("loadingLabel");

let loginButton = document.getElementById("loginButton");
let loggedInDisplay = document.getElementById("loggedInPopup");

let playerLabel = document.getElementById("playerLabel");
let playerProgressBar = document.getElementById("playerProgressBar");
let playerProgressLabel = document.getElementById("playerProgressLabel");
let playerDurationLabel = document.getElementById("playerDurationLabel");

let emojisTextArea = document.getElementById("emojisTextarea");
let formatsTextArea = document.getElementById("formatsTextarea");
let userTokenTextArea = document.getElementById("userTokenTextArea");
userTokenTextArea.addEventListener('keydown', () => saveDirty = true);
formatsTextArea.addEventListener('keydown', () => saveDirty = true);
emojisTextArea.addEventListener('keydown', () => saveDirty = true);

// Functions / Callbacks
const port = chrome.runtime.connect({ name: "Slackify" });
port.onMessage.addListener(message => state = message);

function call(func, args = {}) { 
    port.postMessage({ function: func, args: args }); 
}

loginButton.addEventListener('click', args => call("login"));
saveButton.addEventListener('click', args => { saveDirty = false;
    call("save", 
    { 
        userToken: userTokenTextArea.value,
        emojis: emojisTextArea.value.split('\n'), 
        formats: formatsTextArea.value.split('\n') 
    });
});

function tick() {
    requestAnimationFrame(tick);
    loadingLabel.style.display = loginButton.style.display =
            loggedInDisplay.style.display = "none";

    if (!state)
    {
        loadingLabel.style.display = "block";
        return;
    }

    if (!state.isLoggedIn)
    {
        loginButton.style.display = "block";
        return;
    }

    loggedInDisplay.style.display = "block";

    if (!saveDirty)
    {
        userTokenTextArea.value = state.userToken;

        var formatString = "";
        for (var i = 0; i < state.formats.length; i++)
        { if (i > 0) { formatString += '\n'; }
            formatString += state.formats[i]; }
        formatsTextArea.value = formatString;
    
        var emojiString = "";
        for (var i = 0; i < state.emojis.length; i++)
        { if (i > 0) { emojiString += '\n'; }
            emojiString += state.emojis[i]; }
        emojisTextArea.value = emojiString;
    }

    playerLabel.innerText = state.label;

    var progressMinutes = Math.floor(Math.floor(state.progress / 1000) / 60);
    var durationMinutes = Math.floor(Math.floor(state.duration / 1000) / 60);
    var durationSeconds = Math.floor((state.duration / 1000) - (durationMinutes * 60));
    var progressSeconds = Math.floor((state.progress / 1000) - (progressMinutes * 60));

    playerProgressBar.style.width = ((state.progress / state.duration) * 100) + "%";
    playerProgressLabel.innerText = pad(progressMinutes) + ":" + pad(progressSeconds);
    playerDurationLabel.innerText = pad(durationMinutes) + ":" + pad(durationSeconds);

    let currentTime = new Date();
    state.progress += (currentTime - time);
    time = currentTime;
}

// Init
call("awake");
tick();