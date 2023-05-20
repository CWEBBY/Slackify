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

/*chrome.storage.sync.set({ "yourBody": "myBody" }, function(){
    //  A data saved callback omg so fancy
}); */

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Exports
export class Spotify {
    // Members
    appToken = null;
    userToken = null;

    // Methods
    async login(args = {}) {
        const storage = await chrome.storage.sync.get();

        this.appToken = args.appToken || this.appToken;
        this.userToken = args.userToken || this.userToken;
        
        // Step 1: Pretend nothing's wrong, like the userToken just invalidated...


    }



    async getAccessToken() {
        const storage = await chrome.storage.sync.get();
        const params = new URLSearchParams();
        
        params.append("client_id", APP_ID);
        params.append("code", this.appToken);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", APP_AUTH_CALLBACK_URL);
        params.append("code_verifier", storage.SPOTIFY_VERIFIER);
    
        const result = await fetch("https://accounts.spotify.com/api/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST",
            body: params
        });

         let { access_token } = await result.json();
         return access_token;
    }

    async login(args = {}) {
        this.appToken = args.appToken || this.appToken;
        this.userToken = args.userToken || this.userToken;

        const storage = await chrome.storage.sync.get();
        const params = new URLSearchParams();
        
        params.append("client_id", APP_ID);
        params.append("code", this.appToken);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", APP_AUTH_CALLBACK_URL);
        params.append("code_verifier", storage.SPOTIFY_VERIFIER);

params.append("client_id", APP_ID);
        params.append("code", this.appToken);
        params.append("grant_type", "authorization_code");
        params.append("redirect_uri", APP_AUTH_CALLBACK_URL);
        params.append("code_verifier", storage.SPOTIFY_VERIFIER);
    
        const result = await fetch("https://accounts.spotify.com/api/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST",
            body: params
        });

         let { access_token } = await result.json();





        let verifier = generateCodeVerifier(128);
        const challenge = await generateCodeChallenge(verifier);
    
        await chrome.storage.sync.set({ "SPOTIFY_VERIFIER": verifier });

        const params = new URLSearchParams();
        params.append("client_id", APP_ID);
        params.append("response_type", "code");
        params.append("redirect_uri", APP_AUTH_CALLBACK_URL);
        params.append("scope", "user-read-playback-state");
        params.append("code_challenge_method", "S256");
        params.append("code_challenge", challenge);
    
        chrome.tabs.create({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
    }

    async fetchPlayer() {
        try {
            let playerResponse = await fetch("https://api.spotify.com/v1/me/player", {
                method: "GET", headers: { Authorization: `Bearer ${this.userToken}` }
            });

            playerResponse = await playerResponse.json();
            var artistString = playerResponse.item.artists[0].name;
            for (var i = 1; i < playerResponse.item.artists.length; i++)
                { artistString += "/" + playerResponse.item.artists[i].name; }
            // Because Spotify hands us the artists in list form, concate them.
        
            return {
                artist: artistString,
                track: playerResponse.item.name,
                length: playerResponse.item.duration_ms,
                isPlaying: playerResponse.is_playing && 
                    playerResponse.currently_playing_type == "track",
            }
        }
        catch {
            return {
                artist: null, track: null,
                length: 0, isPlaying: false,
            }
        }
    }
}