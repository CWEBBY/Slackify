console.log("Slackify:spotify.js, cwebby.");

const Spotify = {
    // Consts 
    CLIENT_ID: "bea8890bd8ec4c248ada2195b67b0db3",
    CLIENT_SECRET: "cf42a2372c8f40a2a87a32c72307d1b3",
    CALLBACK_URL: "https://christopherwebb.net/slackify.html",

    // Vars
    accessToken: null,
    refreshToken: null,

    // Functions
    generateCodeVerifier: function (length) {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    },

    generateCodeChallenge: async function (codeVerifier) {
        const data = new TextEncoder().encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }   
};