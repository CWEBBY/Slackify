console.log("Slackify:background.js, cwebby.");

// Imports
//import { Spotify } from "./spotify.js";
//import { Slack } from "./slack.js";
import { pad } from "./utils.js";

// Consts
const TICK_HZ = 1;//0.075;

// Vars
var formats = ["Listening to [TRACK | ARTIST]", "[TRACK | ARTIST]"];
var emojis = [":musical_note:", ":headphones:", ":notes:"];
var userToken = "";

let isLoggedIn = false;
let ui, player;
let openPort;

let progress = 0;
chrome.storage.sync.get().then(result => {
    userToken = result.USER_TOKEN || userToken;
    formats = result.FORMATS || formats;
    emojis = result.EMOJIS || emojis;

    chrome.runtime.onConnect.addListener(port => {
        openPort = port;
    
        port.onDisconnect
            .addListener(() => openPort = null);
    
        port.onMessage.addListener(async message => {
            if (message.caller != "Slackify:Popup" && 
                message.caller != "Slackify:Content") { return; }
            FUNCTION_DEFINES[message.function](message.args);
        });
    });
});

// Functions / Callbacks
const FUNCTION_DEFINES = {
    "save": async args => {
        emojis = args.emojis || emojis;
        formats = args.formats || formats;
        userToken = args.userToken || userToken;

        await chrome.storage.sync.set({ 
            "EMOJIS": emojis ,
            "FORMATS": formats ,
            "USER_TOKEN": userToken
        });

        FUNCTION_DEFINES.tick(ui);
    },

    // Login
    "login": () => {
        isLoggedIn = true;
        FUNCTION_DEFINES.onLogin();
    },
    "onLogin": () => {
        FUNCTION_DEFINES.onTick();

    },

    // Tick.
    "tick": async args => {
        ui = args;

        progress += 1;
        var duration = 90;

        var progressMinutes = Math.floor(progress / 60);
        var durationMinutes = Math.floor(duration / 60);

        openPort?.postMessage({ 
            caller: "Slackify:Background", 
            args: {
                isLoggedIn: isLoggedIn,
                label: "Resonance - HOME",
                duration: pad(durationMinutes) + ":" + pad(duration - (durationMinutes * 60)),
                progressText: pad(progressMinutes) + ":" + pad(progress - (progressMinutes * 60)),
                progressValue: progress / duration,
                emojis: emojis, formats: formats,
                userToken: userToken,
            }
        });
    },
    "onTick": async () =>{
        FUNCTION_DEFINES.tick(ui);
    
        if (!isLoggedIn)
        {
            console.log("Stopping tick loop of Slackify:background because the app is not logged in.");
            return;
        }
    
        setTimeout(FUNCTION_DEFINES.onTick, 1000 / TICK_HZ);
        console.log("tick");
    }
}