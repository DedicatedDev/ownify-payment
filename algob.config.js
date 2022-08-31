// NOTE: below we provide some example accounts.
// DON'T this account in any working environment because everyone can check it and use
// the private keys (this accounts are visible to everyone).
// NOTE: to be able to execute transactions, you need to use an active account with
// a sufficient ALGO balance.
/**
   Check our /docs/algob-config.md documentation (https://github.com/scale-it/algo-builder/blob/master/docs/guide/algob-config.md) for more configuration options and ways how to
  load a private keys:
  + using mnemonic
  + using binary secret key
  + using KMD daemon
  + loading from a file
  + loading from an environment variable
  + ...
*/
// ## ACCOUNTS USING mnemonic ##
const { mkAccounts, algodCredentialsFromEnv } = require("@algo-builder/algob");
let accounts = mkAccounts([
  {
    // This account is created using `make setup-master-account` command from our
    // `/infrastructure` directory. It already has many ALGOs
    name: "master",
    addr: "6NECO3J3PIUQLY6SKZYTKMVFS5SJDHJ6JRRWGJEDFXKQMLOWYI4ET272QA",
    mnemonic:
      "liquid certain escape tank slogan cannon knock mountain duty hobby erosion hint sample connect pulse ability dish tiger galaxy diamond find among monkey abstract what",
  },
  {
    // This account is created using `make setup-master-account` command from our
    // `/infrastructure` directory. It already has many ALGOs
    name: "user1",
    addr: "5C475U46D2YKIAVSNPRJXSINOCA4XRCBDW4BMVESVTAAJWEZQRTRHWYHAU",
    mnemonic:
      "october zoo right river advance online toward scissors rubber filter cash tray couch denial taste eight pilot notable concert unveil alert possible train absorb weird",
  },
]);
// ## ACCOUNTS loaded from a FILE ##
// const { loadAccountsFromFileSync } = require("@algo-builder/algob");
// const accFromFile = loadAccountsFromFileSync("assets/accounts_generated.yaml");
// accounts = accounts.concat(accFromFile);
/// ## Enabling KMD access
/// Please check https://github.com/scale-it/algo-builder/blob/master/docs/guide/algob-config.md#credentials for more details and more methods.
// process.env.$KMD_DATA = "/path_to/KMD_DATA";
// let kmdCred = KMDCredentialsFromEnv();
// ## Algod Credentials
// You can set the credentials directly in this file:
// ## config for indexer running on local
// const indexerCfg = {
//   host: "http://localhost",
//   port: 8980,
//   token: ""
// };
let defaultCfg = {
  host: "http://localhost",
  port: 4001,
  // Below is a token created through our script in `/infrastructure`
  // If you use other setup, update it accordignly (eg content of algorand-node-data/algod.token)
  token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  // you can also pass token as an object
  // token: {
  //   "X-Algo-API-Token": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  // },
  accounts: accounts,
  // if you want to load accounts from KMD, you need to add the kmdCfg object. Please read
  // algob-config.md documentation for details.
  // kmdCfg: kmdCfg,
  // you can pass config of indexer (ideally it should be attached to this network's algod node)
  // indexerCfg: indexerCfg
};
// purestake testnet config
let purestakeTestNetCfg = {
  host: "https://testnet-algorand.api.purestake.io/ps2",
  port: "",
  token: {
    "X-API-Key": "t3aaAoRAOeaPtscwP1ZbV7peKsZhuA4D2Yw4F4ew",
  },
  accounts: accounts
};
// You can also use Environment variables to get Algod credentials
// Please check https://github.com/scale-it/algo-builder/blob/master/docs/algob-config.md#credentials for more details and more methods.
// Method 1
process.env.ALGOD_ADDR = "127.0.0.1:4001";
process.env.ALGOD_TOKEN = "algod_token";
let algodCred = algodCredentialsFromEnv();
let envCfg = {
  host: algodCred.host,
  port: algodCred.port,
  token: algodCred.token,
  accounts: accounts,
};
module.exports = {
  networks: {
    default: purestakeTestNetCfg,
    prod: envCfg,
    purestake: purestakeTestNetCfg,
  },
};

