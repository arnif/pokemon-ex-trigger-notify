const moment = require("moment");
const axios = require("axios");
const Twitter = require("twitter");

const fake_gym = require('./gym_data');
const fake_raids = require('./raid_data');

const possibleGyms = [
  { id: 921, getName: name => name }, // turtle
  { id: 966, getName: name => "Stóriteigur" },
  { id: 757, getName: name => name }, // sonur
];

const alreadyNotified = [];

var client = new Twitter({
  consumer_key: process.env.TWITTER_EX_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_EX_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_EX_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_EX_ACCESS_TOKEN_SECRET,
});

const getGymData = () => {
  return new Promise(resolve => {
    // resolve(fake_gym.gym_data);
    axios.get("http://instinct.hunda.io/gym_data").then(({ data }) => {
      resolve(data);
    });
  });
};

getRaidData = () => {
  return new Promise(resolve => {
    // resolve(fake_raids.raid_data);
    axios.get("http://instinct.hunda.io/raid_data").then(({ data }) => {
      resolve(data);
    });
  });
};

const getPossibleGyms = gyms => {
  return gyms
    .map(gym => {
      const index = possibleGyms.findIndex(g => `fort-${g.id}` === gym.id);
      if (index !== -1) {
        return Object.assign({}, gym, {
          name: possibleGyms[index].getName(gym.name),
        });
      }
    })
    .filter(Boolean);
};

const getPossibleRaids = (raids, gyms) => {
  return raids
    .map(raid => {
      const gym = gyms.find(g => g.id === `fort-${raid.fort_id}`);
      if (gym) {
        return { raid, gym };
      }
    })
    .filter(Boolean);
};

const constructTweet = ({ raid, gym }) => {
  const start = moment(moment.unix(raid.raid_start).format())
    .utcOffset(0)
    .format("HH:mm:ss");
  const end = moment(moment.unix(raid.raid_end).format())
    .utcOffset(0)
    .format("HH:mm:ss");

  const url = `http://maps.google.com/maps?saddr=&daddr=${gym.lat},${gym.lon}&directionsmode=driving`;
  let message = "";
  if (!raid.pokemon_name) {
    message = `Possible EX trigger raid at ${gym.name}. Level ${raid.raid_level}. Starts at: ${start}. Ends at: ${end} ${url}`;
  } else {
    message = `Possible EX trigger raid started! ${gym.name}. Level ${raid.raid_level}, ${raid.pokemon_name}. Ends at: ${end} ${url}`;
  }

  return {
    status: message,
    lat: parseFloat(gym.lat),
    long: parseFloat(gym.lon),
    display_coordinates: true,
  };
};

const tweetRaid = tweetObject => {
  client.post("statuses/update", tweetObject, function(error, tweet, response) {
    if (error) {
      console.log("error", error);
      return;
    }
    console.log("tweet", tweet);
  });
};

const main = () => {
  getGymData().then(gyms => {
    getRaidData().then(raids => {
      const pp = getPossibleGyms(gyms);
      const possibleRaids = getPossibleRaids(raids, pp);
      console.log("nr of possibleGyms", pp.length);
      console.log("nr of possibleRaids", possibleRaids.length);
      possibleRaids.forEach(r => {
        console.log(alreadyNotified);
        const id = r.raid.pokemon_name ? r.raid.pokemon_name : "not-started";
        if (alreadyNotified.indexOf(`${id}-${r.raid.raid_start}`) === -1) {
          const t = constructTweet(r);
          // console.log(t);
          tweetRaid(t);
          alreadyNotified.push(`${id}-${r.raid.raid_start}`);
        } else {
          console.log("already notified", constructTweet(r));
        }
      });
    });
  });
};

main();
setInterval(() => {
  main();
}, 30000);
