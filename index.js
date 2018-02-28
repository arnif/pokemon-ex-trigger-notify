const moment = require("moment");
const axios = require("axios");
const Twitter = require("twitter");

const fake_gym = require("./gym_data");
const fake_raids = require("./raid_data");
const fake_raids2 = require("./raid_datav2");

const raid_url = "http://instinct.hunda.io/raids";

const possibleGyms = [
  // { id: 921, getName: name => name }, // turtle
  // { id: 966, getName: name => "Stóriteigur" },
  // { id: 757, getName: name => name }, // sonur
  // { id: 714, getName: name => name }, // Einar Ben
  { lat: 64.13733, getName: name => name }, // Reykjarvikurvarðan
  { lat: 64.146453, getName: name => name }, // Höfði
];

const alreadyNotified = [];

var client = new Twitter({
  consumer_key: process.env.TWITTER_EX_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_EX_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_EX_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_EX_ACCESS_TOKEN_SECRET,
});

getRaidData = () => {
  return new Promise(resolve => {
    // resolve(fake_raids2.raid_data);
    axios
      .get(raid_url)
      .then(({ data }) => {
        resolve(data);
      })
      .catch(error =>
        console.error(error.response.status, error.response.statusText)
      );
  });
};

const getPossibleRaids = raids => {
  return raids
    .map(raid => {
      const rr = possibleGyms.find(p => p.lat === raid.lat);
      if (rr) {
        return Object.assign({}, raid, rr);
      }
    })
    .filter(Boolean);
};

const constructTweet = raid => {
  const start = moment(moment.unix(raid.time_battle).format())
    .utcOffset(0)
    .format("HH:mm:ss");
  const end = moment(moment.unix(raid.time_end).format())
    .utcOffset(0)
    .format("HH:mm:ss");

  const url = `http://maps.google.com/maps?saddr=&daddr=${raid.lat},${raid.lon}&directionsmode=driving`;
  let message = "";
  if (raid.pokemon_name === "--") {
    message = `Possible EX trigger raid at ${raid.getName(
      raid.name
    )}. Level ${raid.level}. Starts at: ${start}. Ends at: ${end} ${url}`;
  } else {
    message = `Possible EX trigger raid started! ${raid.getName(
      raid.name
    )}. Level ${raid.level}, ${raid.pokemon_name}. Ends at: ${end} ${url}`;
  }

  return {
    status: message,
    lat: parseFloat(raid.lat),
    long: parseFloat(raid.lon),
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
  getRaidData().then(raids => {
    // console.log(raids);
    const possibleRaids = getPossibleRaids(raids);
    console.log(possibleRaids);
    console.log("nr of possibleRaids", possibleRaids.length);
    possibleRaids.forEach(raid => {
      console.log(alreadyNotified);
      const name =
        raid.pokemon_name !== "--" ? raid.pokemon_name : "not-started";
      const id = `${name}-${raid.time_battle}`;
      if (alreadyNotified.indexOf(id) === -1) {
        const t = constructTweet(raid);
        console.log(t);
        tweetRaid(t);
        alreadyNotified.push(id);
      } else {
        console.log("already notified", constructTweet(raid));
      }
    });
  });
};

main();
setInterval(() => {
  main();
}, 30000);
