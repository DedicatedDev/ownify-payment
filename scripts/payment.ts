/**
 * In this script we will fund an escrow contract. The escrow contract
 * ensures the payment is made out(from the escrow) to a specific receiver only.
 * This receiver address is hardcoded in the smart contract, and can be passed
 * dynamically to the contract using fundLsigByFile function (passed as a template parameter)
 */
import * as algob from "@algo-builder/algob";
import { StorageConfig } from "@algo-builder/web/build/types";
import { saveDeployInfo } from "./utils";
const { types } = require("@algo-builder/web");
const { convert } = require("@algo-builder/algob");
async function run(runtimeEnv: algob.types.RuntimeEnv, deployer: algob.types.Deployer): Promise<void> {
  console.log("Deploy script execution started!");
  //    // RECEIVER_ADDRESS is set in escrow.py when it is compiled from PyTEAL to TEAL
  const templateParams = {
    RECEIVER_ADDRESS: "6FUZVRJB64NTDZC2HOAKVGKAOF4K7MRZO2XH65SS2ZXH67SN5HZPVEYEMQ",
  };

  const appStorageConfig: StorageConfig = {
    localInts: 1,
    localBytes: 1,
    globalInts: 8,
    globalBytes: 15,
    appName: "payment",
  };
  const creationFlags = Object.assign({}, appStorageConfig);
  const creationArgs = [convert.addressToPk(templateParams.RECEIVER_ADDRESS)];

  const placeholderParam = {
    TMPL_NOMINAL_PRICE: 1000,
    TMPL_MATURITY_DATE: Math.round(new Date().getTime() / 1000) + 240,
  };

  const appInfo = await deployer.deployApp(
    deployer.accounts[0],
    {
      ...creationFlags,
      appName: "payment",
      metaType: types.MetaType.SOURCE_CODE,
      approvalProgramFilename: "payment_approve.py",
      clearProgramFilename: "payment_clear.py",
      appArgs: creationArgs,
    },
    {},
    {}
  );
  console.log("====================================");
  console.log(appInfo);
  console.log("====================================");
  saveDeployInfo("payment",appInfo)

}

module.exports = { default: run };
