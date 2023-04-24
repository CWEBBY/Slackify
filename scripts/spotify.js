console.log("Slackify:spotify.js, cwebby.");

// Consts
const APP_ID = "bea8890bd8ec4c248ada2195b67b0db3";

// Vars
let player = { artist: null, track: null  };
let verifier = null;

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
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Exports
export class Spotify {
    // Members
    appToken = null;
    userToken = null;
    callbackURL = null;

    // Methods
    async redirectToAuthCodeFlow() {
        verifier = generateCodeVerifier(128);
        const challenge = await generateCodeChallenge(verifier);
    
        const params = new URLSearchParams();
        params.append("client_id", APP_ID);
        params.append("response_type", "code");
        params.append("redirect_uri", this.callbackURL);
        params.append("scope", "user-read-playback-state");
        params.append("code_challenge_method", "S256");
        params.append("code_challenge", challenge);
    
        chrome.tabs.create({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
    }

    async getAccessToken() {
        const params = new URLSearchParams();
        params.append("client_id", APP_ID);
        params.append("grant_type", "authorization_code");
        params.append("code", this.appToken);
        params.append("redirect_uri", this.callbackURL);
        params.append("code_verifier", verifier);
    
        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });
    
        const { access_token } = await result.json();
        return access_token;
    }

    async fetchPlayer() {
        let playerResponse = await fetch("https://api.spotify.com/v1/me/player", {
            method: "GET", headers: { Authorization: `Bearer ${this.userToken}` }
        });
    
        playerResponse = await playerResponse.json();
        var artistString = playerResponse.item.artists[0].name;
        for (var i = 1; i < playerResponse.item.artists.length; i++)
            { artistString += "/" + playerResponse.item.artists[i].name; }
        // Because Spotify hands us the artists in list form, concate them.
    
        var hasChanged = player.artist != artistString 
            || player.track != playerResponse.item.name;
    
        player = {
            artist: artistString,
            track: playerResponse.item.name,
        }
    
        return {
            isPaused: false,
            track: player.track,
            artist: player.artist,
            hasChanged: hasChanged,
        };
    }
}