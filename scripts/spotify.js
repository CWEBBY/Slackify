console.log("Slackify:spotify.js, cwebby.");

// Consts
const APP_ID = "bea8890bd8ec4c248ada2195b67b0db3";
const APP_AUTH_CALLBACK_URL = "https://christopherwebb.net/slackify.html";

// Functions
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Exports
export class Spotify {
    // Members
    appToken = null;
    userToken = null;

    // Methods
    async fetch() {
        let retries = 3;
        
        while (retries > 0)
        {
            // Step 1: Take some shortcuts. No app or user token? get them.
            if (!this.appToken) {
                var verifier = generateCodeVerifier(128);
                var challenge = await generateCodeChallenge(verifier);
            
                await chrome.storage.sync.set({ "SPOTIFY_VERIFIER": verifier });
            
                const params = new URLSearchParams();
                params.append("client_id", APP_ID);
                params.append("response_type", "code");
                params.append("code_challenge", challenge);
                params.append("code_challenge_method", "S256");
                params.append("scope", "user-read-playback-state");
                params.append("redirect_uri", APP_AUTH_CALLBACK_URL);
            
                chrome.tabs.create({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
                console.log("User thrown to Spotify login page.");
                return null;
            }
            
            if (!this.userToken) {
                const params = new URLSearchParams();
                params.append("code", this.appToken);
                params.append("client_id", APP_ID);
                params.append("grant_type", "authorization_code");
                params.append("redirect_uri", APP_AUTH_CALLBACK_URL);

                var storage = await chrome.storage.sync.get()
                params.append("code_verifier", storage.SPOTIFY_VERIFIER);
            
                const result = await fetch("https://accounts.spotify.com/api/token", {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    method: "POST",
                    body: params
                });

                if (!result.ok) { 
                    this.appToken = this.userToken = null; 
                    continue;
                }

                var { access_token } = await result.json();
                this.userToken = access_token;
            }

            // Step 2: If we already HAVE tokens, we need to check they're valid. 
            // Step 2.5: We do this backwards. We fetch the player, and if it works...
            // ...great, but otherwise, the tokens are old. So get them again.
            try {
                const result = await fetch("https://api.spotify.com/v1/me/player", {
                    method: "GET", headers: { Authorization: `Bearer ${this.userToken}` }
                });
            
                if (!result.ok) { 
                    this.appToken = this.userToken = null; 
                    continue;
                }

                var response = await result.json();

                let artistString = "";
                for (var i = 0; i < response.item.artists.length; i++) {
                    if (i > 0) { artistString += "/"; }
                    artistString += response.item.artists[i].name;
                }

                return {
                    artist: artistString,
                    title: response.item.name,
                    paused: response.is_playing,
                    progress: response.progress_ms, 
                    duration: response.item.duration_ms
                };
            }
            catch (ex) {
                console.error(ex);
                return null;
            }
            
            retries--;
        }

        throw "RetriesExceeded";
    }
}