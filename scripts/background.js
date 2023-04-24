console.log("Slackify:background.js, cwebby.");

// Imports
import * as Config from "../config.js";
import { Spotify } from "./spotify.js";
import { Slack } from "./slack.js";

// Vars
let openPort = null;

let slack = new Slack();
slack.userToken = Config.SLACK_USER_TOKEN;

let spotify = new Spotify();
spotify.callbackURL = Config.SPOTIFY_CALLBACK_URL;

// Functions / Callbacks
chrome.runtime.onConnect.addListener(port => {
    openPort = port;
    port.onMessage.addListener(message => {
        if (message["caller"] == "Slackify") 
            { EVENT_HANDLERS[message.event](message.args); }
        else { console.log("Unhandled event: " + message.event); }
    });
});

const EVENT_HANDLERS = {
    "OnAuthentication": async args => {
        if ((spotify.appToken ??= args.appToken) == null)
        {   
            spotify.redirectToAuthCodeFlow();
            return;
        }

        if ((spotify.userToken ??= args.userToken) == null)
        {   
            spotify.userToken = await spotify.getAccessToken();
        }

        console.log("Starting tick loop.");
        onTick();
    }
};

async function onTick()
{
    if (spotify.appToken == null) { // kill the loop until restarted again.
        console.log("Stopping tick loop due to having no Spotify app token.");
        return; 
    }

    if (spotify.userToken == null) { // kill the loop until restarted again.
        console.log("Stopping tick loop due to having no Spotify user token.");
        return; 
    }

    try {
        let player = await spotify.fetchPlayer();
        if (!player.isPaused && player.hasChanged)
        {
            let displayString = Config.STATUS_FORMATS[
                Math.floor(Math.random() * Config.STATUS_FORMATS.length)
            ].replace("TRACK", player.track).replace("ARTIST", player.artist)

            slack.setStatus(
                displayString.length <= 100 ? displayString : 
                    displayString = displayString.substring(0, 96) + "...", 
                Config.EMOJIS[Math.floor(Math.random() * Config.EMOJIS.length)], 0
            );
        }
    }   
    catch (ex) { console.log(ex); }
    setTimeout(onTick, Config.TICK_RATE_MS);
}

onTick();