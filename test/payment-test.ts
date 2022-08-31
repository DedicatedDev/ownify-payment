import { AccountStore, getProgram, Runtime } from "@algo-builder/runtime";
import { types } from "@algo-builder/web";
import { LogicSigAccount } from "algosdk";
import { assert, expect } from "chai";
import * as algob from "@algo-builder/algob";
import { readFileSync } from "fs";
import { StorageConfig } from "@algo-builder/web/build/types";

const minBalance = BigInt(1e6);
const masterBalance = BigInt(10e6);
const amount = BigInt(1e6);

describe("Payment Test", function () {
  let master: AccountStore;
  let user1: AccountStore;
  let user2: AccountStore;
  let runtime: Runtime;
  let appInfo: algob.runtime.rtypes.AppInfo;
  let ownifyAssetId: number;

  const deploy = () => {
    console.log("Deploy script execution started!");
    const appStorageConfig: StorageConfig = {
      localInts: 1,
      localBytes: 1,
      globalInts: 8,
      globalBytes: 15,
      appName: "payment",
    };
    const creationFlags = Object.assign({}, appStorageConfig);
    const creationArgs = [algob.convert.addressToPk(master.address)];

    const placeholderParam: algob.types.SCParams = {
      TMPL_NOMINAL_PRICE: 1000n,
      TMPL_MATURITY_DATE: BigInt(Math.round(new Date().getTime() / 1000) + 240),
    };

    appInfo = runtime.deployApp(
      master.account,
      {
        ...creationFlags,
        appName: "payment",
        metaType: types.MetaType.FILE,
        approvalProgramFilename: "payment - approval.teal",
        clearProgramFilename: "payment - clear.teal",
        appArgs: creationArgs,
      },
      {},
      placeholderParam
    );

    ownifyAssetId = runtime.deployASA("ownify", {
      creator: { ...user1.account, name: "ownify-token-creator" },
    }).assetIndex;
  };

  beforeEach(async function () {
    master = new AccountStore(masterBalance);
    user1 = new AccountStore(minBalance);
    user2 = new AccountStore(masterBalance);
    runtime = new Runtime([master, user1, user2]);
    deploy();
  });

  it("Should set admin function", async () => {
    const appArgs = ["str:set admin", algob.convert.addressToPk(user1.address)]; // converts algorand address to Uint8Array
    const appCallParams: types.ExecParams = {
      type: types.TransactionType.CallApp,
      sign: types.SignType.SecretKey,
      fromAccount: master.account,
      appID: appInfo.appID,
      payFlags: {},
      appArgs: appArgs,
    };
    runtime.executeTx([appCallParams]);
    assert.deepEqual(runtime.getGlobalState(appInfo.appID, "admin"), algob.convert.addressToPk(user1.address));
  });

  it("Should reject set admin by none creator", async () => {
    const appArgs = ["str:set admin", algob.convert.addressToPk(user1.address)]; // converts algorand address to Uint8Array
    const appCallParams: types.ExecParams = {
      type: types.TransactionType.CallApp,
      sign: types.SignType.SecretKey,
      fromAccount: user1.account,
      appID: appInfo.appID,
      payFlags: {},
      appArgs: appArgs,
    };
    assert.throw(() => runtime.executeTx([appCallParams]));
  });

  it.only("Should deposit fee to escrow", () => {
    //check master account holding ownify asset
    assert.equal(runtime.getAssetHolding(ownifyAssetId, user1.address).amount, 1n);
    //optIn receiver account to transfer
    runtime.optInToASA(ownifyAssetId, user2.address, {});

    const sendAssetTx: types.ExecParams[] = [
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        toAccountAddr: appInfo.applicationAccount,
        amountMicroAlgos: 2000,
        payFlags: { totalFee: 1000 },
      },
      {
        type: types.TransactionType.TransferAsset,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        toAccountAddr: user2.address,
        amount: 1,
        assetID: ownifyAssetId,
        payFlags: { totalFee: 1000 },
      },
    ];
    runtime.executeTx(sendAssetTx);
    const appAccount = runtime.getAccount(appInfo.applicationAccount);
    assert.equal(appAccount.balance(), 2000n);

    const holdingAsset = runtime.getAssetHolding(ownifyAssetId, user2.address);
    assert.equal(holdingAsset.amount, 1n);
  });
});
