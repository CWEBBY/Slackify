console.log("Slackify:background.js, cwebby.");

// Imports
import { Spotify } from "./spotify.js";
import { Slack } from "./slack.js";

// Consts
const TICK_HZ = .1;
const DEFAULTS = {
    formats: ["Listening to [TRACK | ARTIST]", "[TRACK | ARTIST]"],
    emojis: [":musical_note:", ":headphones:", ":notes:"]
};

// Vars
let spotify = new Spotify();
let slack = new Slack();

let state = null;
let openPort;

chrome.storage.sync.get().then(result => {
    spotify.refreshToken = result.SPOTIFY_REFRESH_TOKEN || null;
    spotify.accessToken = result.SPOTIFY_ACCESS_TOKEN || null;

    state = { 
        emojis: result.EMOJIS || DEFAULTS.emojis,
        formats: result.FORMATS || DEFAULTS.formats,
        userToken: slack.userToken = result.SLACK_USER_TOKEN || null
    };

    chrome.runtime.onConnect.addListener(port => {
        openPort = port;
    
        port.onMessage.addListener(async message =>
            CALLBACKS[message.function](message.args));
        port.onDisconnect.addListener(() => openPort = null);
    });

    tick();
});

// Functions / Callbacks
async function tick() {
    state.isLoggedIn = spotify.isLoggedIn;

    if (!spotify.isLoggedIn) { 
        console.log("Spotify not logged in. Killing tick loop.");
        return;
    }

    try {
        let player = await spotify.fetch();
        let hasChanged = player != null && 
            (state.player?.track != player.track || 
            state.player?.artist != player.artist);
        if (player != null) { state.player = player; }

        if (hasChanged) {
            let emoji = state.emojis[Math.floor(Math.random() * state.emojis.length)];
            let label = state.formats[Math.floor(Math.random() * state.formats.length)];
            
            label = label.replace("TRACK", player.track).replace("ARTIST", player.artist);
            if (label.length > 99) { label = label.substring(0, 96) + "..."; }

            state.label = label;
            state.emoji = emoji;

            let statusExpiration = Date.now() + (player.durationMs - player.progressMs);
            slack.setStatus(label, emoji, statusExpiration)
        }

        openPort?.postMessage(state);
    }
    catch (ex) {
        console.error(ex);
        return;
    }

    setTimeout(tick, 1000 / TICK_HZ);
}

const CALLBACKS = {
    // Awake
    "onAwake": () => {
        openPort?.postMessage(state);
    },

    // Login
    "onLogin": () => spotify.login(),
    "onLoggedIn": async args => {
        if (args.error) { console.error(args.error); }
        else { await spotify.login(args); }

        tick();
    },

    // Save
    "onSave": async args => {
        await chrome.storage.sync.set({ 
            EMOJIS: state.emojis = args.emojis,
            FORMATS: state.formats = args.formats,
            SLACK_USER_TOKEN: slack.userToken = state.userToken = args.userToken 
        });  

        openPort?.postMessage(state);
    } 
};