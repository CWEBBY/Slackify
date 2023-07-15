console.log("Slackify:slack.js, cwebby.");

const Slack = {
    // Vars 
    userToken: null,
    
    // Functions 
    setStatus: async function(userToken, text, icon, expirationTime) {
        return fetch("https://slack.com/api/users.profile.set", { 
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `token=${userToken}&profile=${JSON.stringify({
                status_text: text, status_emoji: icon, 
                status_expiration: (expirationTime + 3000) / 1000
            })}`, // body data type must match "Content-Type" header
        });
    }
};