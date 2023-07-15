console.log("Slackify:index.js, cwebby.");
// NOTE: this will not run if the user does not have the extension installed.
//  So assumptions can be made about state, but be aware there is hidden state not considered.
//  I'm also not happy about the monolithic file... but that's what I get for making a Chrome extension...

// Includes
// -utils.js (Utils)
// -slack.js (Slack)
// -spotify.js (Spotify)

// Consts
const TICK_HZ = .1;
const DEFAULTS = { emojis: [":musical_note:", ":headphones:", ":notes:"],
    formats: ["Listening to [TRACK | ARTISTS]", "[TRACK | ARTISTS]"] };

const messageSection = document.getElementById("message");
const loggedInSection = document.getElementById("loggedInSection");
const loggedOutSection = document.getElementById("loggedOutSection");
const playerRightLabel = document.getElementById("playerRightLabel");
const playerLeftLabel = document.getElementById("playerLeftLabel");
const playerFormat = document.getElementById("playerFormat");
const playerRoot = document.getElementById("playerRoot");
const playerBar = document.getElementById("playerBar");

const emojisInput = document.getElementById("emojisInput");
const formatsInput = document.getElementById("formatsInput");
formatsInput.addEventListener('keydown', () => saveDirty = true);
emojisInput.addEventListener('keydown', () => saveDirty = true);

document.getElementById("signInButton").addEventListener("click", async function () {
    var verifier, challenge;
    await chrome.storage.sync.set({ "Spotify.verifier": 
        verifier = Spotify.generateCodeVerifier(128) });
    challenge = await Spotify.generateCodeChallenge(verifier);

    params = new URLSearchParams();
    params.append("response_type", "code");
    params.append("code_challenge", challenge);
    params.append("client_id", Spotify.CLIENT_ID);
    params.append("code_challenge_method", "S256");
    params.append("redirect_uri", Spotify.CALLBACK_URL);
    params.append("scope", "user-read-playback-state");

    window.open(`https://accounts.spotify.com/authorize?${params.toString()}`, '_self');
    console.log("User thrown to Spotify login page.");
});

document.getElementById("saveButton").addEventListener("click", async function() {
    await chrome.storage.sync.set({
        "Slack.userToken": Slack.userToken = userTokenInput.value,
        "formats": formats = formatsInput.value.split("\n"),
        "emojis": emojis = emojisInput.value.split("\n")
    });
    
    saveDirty = false;
});

// Vars
var params = new URLSearchParams(window.location.search);
var format = null, emoji = null;
var formats = [], emojis = [];
var saveDirty = false;
let time = new Date();
var player = null;

// Callbacks
async function init() {
    messageSection.style.display = "none";

    // Storage unpacking.
    var storage = await chrome.storage.sync.get();

    emojis = storage["emojis"] || DEFAULTS.emojis;
    formats = storage["formats"] || DEFAULTS.formats;
    Slack.userToken = storage["Slack.userToken"] || null;
    Spotify.verifier = storage["Spotify.verifier"] || null;
    Spotify.accessToken = storage["Spotify.accessToken"] || null;
    Spotify.refreshToken = storage["Spotify.refreshToken"] || null;

    // Login process.
    if (Spotify.accessToken == null && code != null) {
        // ...in other words, if the app is mid-login.
        params = new URLSearchParams();

        params.append("code", code);
        params.append("client_id", Spotify.CLIENT_ID);
        params.append("code_verifier", Spotify.verifier);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", Spotify.CALLBACK_URL);
    
        var result = await fetch("https://accounts.spotify.com/api/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST", body: params 
        });
    
        if (!result.ok) {
            messageSection.style.display = "block";
            messageSection.innerText = "An error occured while connecting your Spotify account.\n[" + result.statusText + "]";
            return;
        }

        result = await result.json();
        await chrome.storage.sync.set({
            "Spotify.accessToken": Spotify.accessToken = result.access_token,
            "Spotify.refreshToken": Spotify.refreshToken = result.refresh_token
        });
    }

    if (Spotify.accessToken) 
        poll(); 
    tick();
}

function tick() {
    var isLoggedIn = Spotify.accessToken != null;
    loggedOutSection.style.display = isLoggedIn ? "none" : "block";
    loggedInSection.style.display = !isLoggedIn || player == null ? "none" : "block"; 

    if (!isLoggedIn) {
        console.log("Stopping tick loop because Spotify is not logged in.") 
        return;
    }

    if (!saveDirty) {
        emojisInput.value = emojis.join("\n");
        formatsInput.value = formats.join("\n");
        userTokenInput.value = Slack.userToken;
    } 

    if (player == null) 
        playerRoot.style.display = "none";
    else {
        playerFormat.innerText = format;
        playerRoot.style.display = "block";

        var progressMinutes = Math.floor(Math.floor(player.progressMS / 1000) / 60);
        var durationMinutes = Math.floor(Math.floor(player.durationMS / 1000) / 60);
        var progressSeconds = Math.floor((player.progressMS / 1000) - (progressMinutes * 60));
        var durationSeconds = Math.floor((player.durationMS / 1000) - (durationMinutes * 60));

        playerLeftLabel.innerText = pad(progressMinutes) + ":" + pad(progressSeconds);
        playerRightLabel.innerText = pad(durationMinutes) + ":" + pad(durationSeconds);
        playerBar.style.width = (player.progressMS / player.durationMS) + "%";

        if (player.isPlaying) {
            let currentTime = new Date();
            player.progressMS += (currentTime - time);
            time = currentTime;
        }
    }

    requestAnimationFrame(tick);
}

async function poll() {
    if (Spotify.accessToken == null) {
        console.error("Trying to poll Spotify without access token.")
        return;
    }
    
    var result = await fetch("https://api.spotify.com/v1/me/player", {
        method: "GET", headers: { Authorization: `Bearer ${Spotify.accessToken}` }
    });

    if (!result.ok) {
        // this is likely because of an old access token...
        params = new URLSearchParams();
        params.append("client_id", Spotify.CLIENT_ID);
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", Spotify.refreshToken);
    
        result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST", body: params, headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + btoa(Spotify.CLIENT_ID + ":" + Spotify.CLIENT_SECRET) 
            }
        });

        if (!result.ok) {
            // okay... there was an ACTUAL error...
            console.error(await result.json());
            player = null;

            console.log(Spotify)

            return;
        }

        result = await result.json();
        await chrome.storage.sync.set({
            "Spotify.accessToken": Spotify.accessToken = result.access_token,
            "Spotify.refreshToken": Spotify.refreshToken = result.refresh_token
        });

        poll();
        return;
    }
    
    result = await result.json();
    var playerResult = {
        isPlaying: result.is_playing && 
            result.currently_playing_type == "track",
        isPrivate: result.device.is_private_session,
        
        track: result.item.name,
        artists: result.item.artists
            .map(artist => artist.name).join("/"),

        progressMS: result.progress_ms,
        durationMS: result.item.duration_ms
    }

    var needsPosting = (player == null && playerResult != null) || 
        player?.isPlaying != playerResult.isPlaying || 
        player?.isPrivate != playerResult.isPrivate || 
        player?.artists != playerResult.artists || 
        player?.track != playerResult.track;
    player = playerResult;

    if (needsPosting) {
        emoji = emojis[Math.round(Math.random() * (emojis.length - 1))];
        format = formats[Math.round(Math.random() * (formats.length - 1))]
            .replace("TRACK", player.track).replace("ARTISTS", player.artists);
        if (format.length > 100) // cap this because it's the max Slack status size.
            format = format.substring(0, 97) + "...";
            
        Slack.setStatus(Slack.userToken, format, emoji, 
            Date.now() + (player.durationMS - player.progressMS));
    }

    setTimeout(poll, 1000 / TICK_HZ);
}

// Init
var code = params.get("code");
var error = params.get("error");
if (error != null) { messageSection.innerText = 
    "An error occured while connecting your Spotify account.\n[" + error + "]"; }
else { init(); }