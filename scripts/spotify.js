console.log("Slackify:spotify.js, cwebby.");

// Consts
const APP_ID = "bea8890bd8ec4c248ada2195b67b0db3";
const APP_SECRET = "cf42a2372c8f40a2a87a32c72307d1b3";
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

var verifier = generateCodeVerifier(128);

// Exports
export class Spotify {
    // Members
    refreshToken;
    accessToken;

    // Properties
    get isLoggedIn() { return this.accessToken != null; }

    // Methods
    async login(args = {}) {
        let result = null;
        let params = new URLSearchParams();

        // If there isn't a refresh token saved...
        if (!this.refreshToken) {
            if (!args.code) {
                params.append("client_id", APP_ID);
                params.append("response_type", "code");
                params.append("code_challenge_method", "S256");
                params.append("scope", "user-read-playback-state");
                params.append("redirect_uri", APP_AUTH_CALLBACK_URL);
                params.append("code_challenge", await generateCodeChallenge(verifier));
            
                chrome.tabs.create({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
                console.log("User thrown to Spotify login page.");
                return;
            }

            params.append("code", args.code);
            params.append("client_id", APP_ID);
            params.append("code_verifier", verifier);
            params.append("grant_type", "authorization_code");
            params.append("redirect_uri", APP_AUTH_CALLBACK_URL);
        
            result = await fetch("https://accounts.spotify.com/api/token", {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                method: "POST",
                body: params
            });
        }
        // If there IS a refresh token saved. 
        else {
            params.append("client_id", APP_ID);
            params.append("grant_type", "refresh_token");
            params.append("refresh_token", this.refreshToken);
        
            result = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST", body: params, headers: { 
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Basic " + btoa(APP_ID + ":" + APP_SECRET) 
                }
            });
        }

        if (!result.ok) {
            console.error(await result.json())
            this.refreshToken = null;
            
            return;
        }
        
        var jsonResult = await result.json();
        var { access_token, refresh_token } = jsonResult;

        await chrome.storage.sync.set({ 
            SPOTIFY_ACCESS_TOKEN: this.accessToken = access_token,
            SPOTIFY_REFRESH_TOKEN: this.refreshToken = refresh_token
        });        
    }

    async fetch() {
        let result = await fetch("https://api.spotify.com/v1/me/player", {
            method: "GET", headers: { Authorization: `Bearer ${this.accessToken}` }
        });
    
        if (!result.ok){
            await this.login();
            await this.fetch();
            return;
        }

        result = await result.json();
        if (result.currently_playing_type != "track") { return null; }

        let artistString = "";
        for (var artist in result.item.artists) {
            if (artist > 0) { artistString += "/"; }
            artistString += result.item.artists[artist].name;
        }
        
        return {
            artist: artistString,
            track: result.item.name,

            isPaused: !result.is_playing,

            progressMs: result.progress_ms,
            durationMs: result.item.duration_ms,
        };
    }
}