const moment = require('moment');
const axios = require('axios');
const Twitter = require('twitter');

const possibleGyms = ['Turtle', 'Stóriteigur - Public playground and Mini Park'];

const alreadyNotified = [];

var client = new Twitter({
    consumer_key: process.env.TWITTER_EX_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_EX_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_EX_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_EX_ACCESS_TOKEN_SECRET,
});

const getGymData = () => {
    return new Promise(resolve => {
        axios.get('http://instinct.hunda.io/gym_data').then(({data}) => {
            resolve(data);
        });
    });
};

getRaidData = () => {
    return new Promise(resolve => {
        axios.get('http://instinct.hunda.io/raid_data').then(({data}) => {
            resolve(data);
        });
    });
};

const getPossibleGyms = gyms => {
    return gyms
        .map(gym => {
            const index = possibleGyms.findIndex(g => g === gym.name);
            if (index !== -1) {
                return gym;
            }
        })
        .filter(Boolean);
};

const getPossibleRaids = (raids, gyms) => {
    return raids
        .map(raid => {
            const gym = gyms.find(g => g.id === `fort-${raid.fort_id}`);
            if (gym) {
                return {raid, gym};
            }
        })
        .filter(Boolean);
};

const constructTweet = ({raid, gym}) => {
    const start = moment(moment.unix(raid.raid_start).format())
        .utcOffset(0)
        .format('HH:mm:ss');
    const end = moment(moment.unix(raid.raid_end).format())
        .utcOffset(0)
        .format('HH:mm:ss');

    const url = `http://maps.google.com/maps?saddr=&daddr=${gym.lat},${
        gym.lon
    }&directionsmode=driving`;
    let message = '';
    if (!raid.pokemon_name) {
        message = `Possible EX trigger raid at ${gym.name}. Level ${raid.raid_level}. Starts at: ${
            start
        }. Ends at: ${end} ${url}`;
    } else {
        message = `Possible EX trigger raid started! ${gym.name}. Level ${raid.raid_level}, ${
            raid.pokemon_name
        }. Ends at: ${end} ${url}`;
    }

    return {
        status: message,
        lat: parseFloat(gym.lat),
        long: parseFloat(gym.lon),
        display_coordinates: true,
    };
};

const tweetRaid = tweetObject => {
    client.post('statuses/update', tweetObject, function(error, tweet, response) {
        if (error) {
            console.log('error', error);
            return;
        }
        console.log('tweet', tweet);
    });
};

const main = () => {
    getGymData().then(gyms => {
        getRaidData().then(raids => {
            const pp = getPossibleGyms(gyms);
            const possibleRaids = getPossibleRaids(raids, pp);
            possibleRaids.forEach(r => {
                if (alreadyNotified.indexOf(r.raid.raid_id) === -1) {
                    tweetRaid(constructTweet(r));
                    alreadyNotified.push(`${r.raid.raid_id}-${r.raid.raid_start}`);
                } else {
                    console.log('already notified', constructTweet(r));
                }
            });
        });
    });
};

main();
setInterval(() => {
    main();
}, 30000);
