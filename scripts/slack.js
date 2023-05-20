console.log("Slackify:slack.js, cwebby.");

// Exports
export class Slack {
    constructor(params = {}) {
        this.userToken = params.userToken || null;
    }

    // Members
    userToken;

    // Methods
    setStatus(text, icon, expirationTime) {
        return fetch("https://slack.com/api/users.profile.set", { 
            method: "POST", 
            headers: { 
                "Authorization": "Bearer " + this.userToken,
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                profile: {
                    status_text: text, status_emoji: icon, 
                    status_expiration: expirationTime
                }
            })
        });
    }
}