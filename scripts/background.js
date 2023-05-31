console.log("Slackify:background.js, cwebby.");

// Imports
import { Spotify } from "./spotify.js";
import { Slack } from "./slack.js";

// Consts
const TICK_HZ = .5;

// Vars
var formats = ["Listening to [TRACK | ARTIST]", "[TRACK | ARTIST]"];
var emojis = [":musical_note:", ":headphones:", ":notes:"];
var userToken = "";

let spotify = new Spotify();
let slack = new Slack();

let hasInitialised = false;
let isLoggedIn = false;
let state = null;
let openPort;

chrome.storage.sync.get().then(result => {
    emojis = result.EMOJIS || emojis;
    formats = result.FORMATS || formats;
    userToken = result.USER_TOKEN || userToken;

    slack.userToken = result.USER_TOKEN || slack.userToken;
    spotify.appToken = result.SPOTIFY_APP_TOKEN || spotify.appToken;
    spotify.userToken = result.SPOTIFY_USER_TOKEN || spotify.userToken;

    chrome.runtime.onConnect.addListener(port => {
        openPort = port;
    
        openPort?.postMessage(null);
        port.onMessage.addListener(async message =>
            FUNCTION_DEFINES[message.function](message.args));
        port.onDisconnect.addListener(() => openPort = null);
    });

    isLoggedIn = spotify.appToken != null;
    hasInitialised = true;

    FUNCTION_DEFINES.tick();
});

// Functions / Callbacks
const FUNCTION_DEFINES = {
    "awake": () => {
        if (!hasInitialised) { FUNCTION_DEFINES.tick(); }
        openPort?.postMessage(state);
    },

    "save": async args => {
        emojis = args.emojis || emojis;
        formats = args.formats || formats;
        userToken = args.userToken || userToken;

        await chrome.storage.sync.set({ "EMOJIS": emojis ,
            "FORMATS": formats, "USER_TOKEN": userToken });

        FUNCTION_DEFINES.tick();
    },

    // Login
    "login": async () => { spotify.fetch(); }, // kicks off the process.
    "onLogin": async args => {
        await chrome.storage.sync.set({ "SPOTIFY_APP_TOKEN": spotify.appToken = args.appToken });
        isLoggedIn = spotify.appToken != null;
        FUNCTION_DEFINES.tick();
    },

    // Tick.
    "tick": async () => {
        if (!hasInitialised) { openPort?.postMessage(state); }
            // Trick the UI into thinking we haven't initialised.
        let player = !isLoggedIn ? null : await spotify.fetch();

        if (!player)
        {
            isLoggedIn = false;

            console.log("Stopping tick loop of Slackify:background because the app is not logged in.");
            openPort?.postMessage({ isLoggedIn: isLoggedIn });
            return;
        }

        // Made it this far? MUST have been successful, so save the working token.
        await chrome.storage.sync.set({ "SPOTIFY_USER_TOKEN": spotify.userToken });

        var hasChanged = state == null || 
            player.paused != state?.paused || 
            player.artist != state?.artist ||
            player.title != state?.title;

        state = !hasChanged ? state : {
            isLoggedIn: isLoggedIn,
            formats: formats,
            emojis: emojis,

            duration: player.duration,
            progress: player.progress,

            paused: player.paused,
            artist: player.artist,
            title: player.title,

            userToken: userToken,
            emoji: emojis[Math.floor(Math.random() * formats.length)],
            label: formats[Math.floor(Math.random() * formats.length)]
                .replace("TRACK", player.title).replace("ARTIST", player.artist)
        };

        if (state.label.length >= 100) 
            { state.label = state.label.substring(0, 96) + "..."}

        state.duration = player.duration;
        state.progress = player.progress;
        openPort?.postMessage(state);

        slack.setStatus(state.label, state.emoji, state.progress);
        setTimeout(FUNCTION_DEFINES.tick, 1000 / TICK_HZ);
    }
}