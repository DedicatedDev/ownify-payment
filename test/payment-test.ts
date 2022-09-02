import { AccountStore, getProgram, Runtime } from "@algo-builder/runtime";
import { getSuggestedParams, types } from "@algo-builder/web";
import { LogicSigAccount } from "algosdk";
import { assert, expect } from "chai";
import * as algob from "@algo-builder/algob";
import { readFileSync } from "fs";
import { StorageConfig } from "@algo-builder/web/build/types";

const initialBalance = BigInt(10000e6);
//const masterBalance = BigInt(10000e6);
const serviceFee = BigInt(1e6);
const depositedBalance = BigInt(1000e6);

describe("Payment Test", function () {
  let master: AccountStore;
  let contractAdmin: AccountStore;
  let user1: AccountStore;
  let user2: AccountStore;
  let runtime: Runtime;
  let appInfo: algob.runtime.rtypes.AppInfo;
  let ownifyAssetId: number;

  const deploy = () => {
    const appStorageConfig: StorageConfig = {
      localInts: 1,
      localBytes: 1,
      globalInts: 8,
      globalBytes: 20,
      appName: "payment",
    };
    const creationFlags = Object.assign({}, appStorageConfig);
    const creationArgs = [algob.convert.addressToPk(master.address), "int:75000"];

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

    // ownifyAssetId = runtime.deployASA("ownify", {
    //   creator: { ...user1.account, name: "ownify-token-creator" },
    // }).assetIndex;
  };

  beforeEach(async function () {
    master = new AccountStore(initialBalance);
    contractAdmin = new AccountStore(0);
    user1 = new AccountStore(initialBalance);
    user2 = new AccountStore(initialBalance);

    runtime = new Runtime([master, user1, user2]);
    deploy();
  });

  it("Should create nft", () => {
    const appArgs = ["str:nft_create"];
    const createNFTTx: types.ExecParams[] = [
      {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        appID: appInfo.appID,
        payFlags: {},
        appArgs: appArgs,
      },
      {
        type: types.TransactionType.DeployASA,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        asaName: "ownify",
        payFlags: { totalFee: 1000 },
      },
    ];
    const txs = runtime.executeTx(createNFTTx);
    assert.isDefined((txs[1] as algob.runtime.rtypes.ASAInfo).assetIndex);
  });

  it("Should reject to create nft with invalid tx", () => {
    const appArgs = ["str:nft_create", algob.convert.addressToPk(user1.address)];
    const createNFTTx: types.ExecParams[] = [
      {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        appID: appInfo.appID,
        payFlags: {},
        appArgs: appArgs,
      },
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        toAccountAddr: appInfo.applicationAccount,
        amountMicroAlgos: 2000,
        payFlags: { totalFee: 1000 },
      },
    ];
    assert.throw(() => runtime.executeTx(createNFTTx));
  });

  it("Should transfer nft", () => {
    const createNftArgs = ["str:nft_create"];
    const createNFTTx: types.ExecParams[] = [
      {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        appID: appInfo.appID,
        payFlags: {},
        appArgs: createNftArgs,
      },
      {
        type: types.TransactionType.DeployASA,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        asaName: "ownify",
        payFlags: { totalFee: 1000 },
      },
    ];
    const nftCreateTxs = runtime.executeTx(createNFTTx);
    const createdAssetId = (nftCreateTxs[1] as algob.runtime.rtypes.ASAInfo).assetIndex;
    assert.isDefined(createdAssetId);
    assert.equal(runtime.getAssetHolding(createdAssetId, user1.address).amount, 1n);

    //OptIn Asset
    runtime.optInToASA(createdAssetId, user2.address, {});

    //transfer nft to user2.
    const transferNftArgs = ["str:nft_transfer", algob.convert.addressToPk(user2.address)];
    const transferNFTTx: types.ExecParams[] = [
      {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        appID: appInfo.appID,
        payFlags: {},
        appArgs: transferNftArgs,
      },
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        toAccountAddr: appInfo.applicationAccount,
        amountMicroAlgos: 75000,
        payFlags: { totalFee: 1000 },
      },
      {
        type: types.TransactionType.TransferAsset,
        sign: types.SignType.SecretKey,
        fromAccount: user1.account,
        toAccountAddr: user2.address,
        amount: 1n,
        assetID: createdAssetId,
        payFlags: { totalFee: 1000 },
      },
    ];
    runtime.executeTx(transferNFTTx);
  });

  it.only("Should set admin function", async () => {
    const appArgs = ["str:set admin", algob.convert.addressToPk(user2.address)]; // converts algorand address to Uint8Array
    const appCallParams: types.ExecParams = {
      type: types.TransactionType.CallApp,
      sign: types.SignType.SecretKey,
      fromAccount: master.account,
      appID: appInfo.appID,
      payFlags: {},
      appArgs: appArgs,
    };
    runtime.executeTx([appCallParams]);
    console.log('====================================');
    console.log(runtime.getGlobalState(appInfo.appID, "admin"));
    //console.log(parseInt(runtime.getGlobalState(appInfo.appID, "fee")));
    console.log('====================================');
    assert.deepEqual(runtime.getGlobalState(appInfo.appID, "admin"), algob.convert.addressToPk(user2.address));
  });

  // it("Should reject set admin by none creator", async () => {
  //   const appArgs = ["str:set admin", algob.convert.addressToPk(user1.address)]; // converts algorand address to Uint8Array
  //   const appCallParams: types.ExecParams = {
  //     type: types.TransactionType.CallApp,
  //     sign: types.SignType.SecretKey,
  //     fromAccount: user1.account,
  //     appID: appInfo.appID,
  //     payFlags: {},
  //     appArgs: appArgs,
  //   };
  //   assert.throw(() => runtime.executeTx([appCallParams]));
  // });

  // it("Should deposit fee to escrow", () => {
  //   //check master account holding ownify asset
  //   assert.equal(runtime.getAssetHolding(ownifyAssetId, user1.address).amount, 1n);
  //   //optIn receiver account to transfer
  //   runtime.optInToASA(ownifyAssetId, user2.address, {});

  //   const sendAssetTx: types.ExecParams[] = [
  //     {
  //       type: types.TransactionType.TransferAlgo,
  //       sign: types.SignType.SecretKey,
  //       fromAccount: user1.account,
  //       toAccountAddr: appInfo.applicationAccount,
  //       amountMicroAlgos: 2000,
  //       payFlags: { totalFee: 1000 },
  //     },
  //     {
  //       type: types.TransactionType.TransferAsset,
  //       sign: types.SignType.SecretKey,
  //       fromAccount: user1.account,
  //       toAccountAddr: user2.address,
  //       amount: 1,
  //       assetID: ownifyAssetId,
  //       payFlags: { totalFee: 1000 },
  //     },
  //   ];
  //   runtime.executeTx(sendAssetTx);
  //   const appAccount = runtime.getAccount(appInfo.applicationAccount);
  //   assert.equal(appAccount.balance(), 2000n);

  //   const holdingAsset = runtime.getAssetHolding(ownifyAssetId, user2.address);
  //   assert.equal(holdingAsset.amount, 1n);
  // });

  // it("Should withdraw algo as owner", () => {
  //   //Send Asset

  //   //check master account holding ownify asset
  //   assert.equal(runtime.getAssetHolding(ownifyAssetId, user1.address).amount, 1n);
  //   //optIn receiver account to transfer
  //   runtime.optInToASA(ownifyAssetId, user2.address, {});

  //   const sendAssetTx: types.ExecParams[] = [
  //     {
  //       type: types.TransactionType.TransferAlgo,
  //       sign: types.SignType.SecretKey,
  //       fromAccount: user1.account,
  //       toAccountAddr: appInfo.applicationAccount,
  //       amountMicroAlgos: depositedBalance,
  //       payFlags: { totalFee: 1000 },
  //     },
  //     {
  //       type: types.TransactionType.TransferAsset,
  //       sign: types.SignType.SecretKey,
  //       fromAccount: user1.account,
  //       toAccountAddr: user2.address,
  //       amount: 1,
  //       assetID: ownifyAssetId,
  //       payFlags: { totalFee: 1000 },
  //     },
  //   ];
  //   runtime.executeTx(sendAssetTx);
  //   const appAccount = runtime.getAccount(appInfo.applicationAccount);
  //   assert.equal(appAccount.balance(), depositedBalance);

  //   const holdingAsset = runtime.getAssetHolding(ownifyAssetId, user2.address);
  //   assert.equal(holdingAsset.amount, 1n);

  //   const beforeBalance = runtime.getAccount(master.address).balance();

  //   //Withdraw Fee
  //   const appArgs = ["str:withdraw", "str:10000000"];
  //   const appCallParams: types.ExecParams = {
  //     type: types.TransactionType.CallApp,
  //     sign: types.SignType.SecretKey,
  //     fromAccount: master.account,
  //     appID: appInfo.appID,
  //     payFlags: {},
  //     appArgs: appArgs,
  //   };

  //   const txs: algob.runtime.rtypes.TxReceipt[] = runtime.executeTx([appCallParams]);
  //   const tx = txs[0] as algob.runtime.rtypes.BaseTxReceipt;
  //   const fee = BigInt(tx.txn.fee ?? 0);
  //   const afterBalance = runtime.getAccount(master.address);
  //   const balance = afterBalance.balance();
  //   assert.equal(balance, beforeBalance - fee + 10000000n);
  // });

  // it.only("Should transfer asset to another", () => {
  //   //Send Asset

  //   //check master account holding ownify asset
  //   assert.equal(runtime.getAssetHolding(ownifyAssetId, user1.address).amount, 1n);
  //   //optIn receiver account to transfer
  //   runtime.optInToASA(ownifyAssetId, user2.address, {});

  //   //Create asset
  //   const appArgs = ["str:create_asset"];
  //   //const appAccount = runtime.getAccount(appInfo.applicationAccount)

  //   const createAssetTx: types.ExecParams[] = [
  //     {
  //       type: types.TransactionType.TransferAlgo,
  //       sign: types.SignType.SecretKey,
  //       fromAccount: user1.account,
  //       toAccountAddr: appInfo.applicationAccount,
  //       amountMicroAlgos: 200000,
  //       payFlags: { totalFee: 1000 },
  //     },
  //     {
  //       type: types.TransactionType.CallApp,
  //       sign: types.SignType.SecretKey,
  //       fromAccount: master.account,
  //       appID: appInfo.appID,
  //       payFlags: { rekeyTo: user1.address },
  //       appArgs: appArgs,
  //     },
  //   ];

  //   // const fee: types.TxParams = {
  //   //   type: types.TransactionType.TransferAlgo,
  //   //   sign: types.SignType.SecretKey,
  //   //   fromAccount: user1.account,
  //   //   toAccountAddr: appInfo.applicationAccount,
  //   //   amountMicroAlgos: depositedBalance,
  //   //   payFlags: { totalFee: 1000 },
  //   // };

  //   // const appCallParams: types.ExecParams = {
  //   //   type: types.TransactionType.CallApp,
  //   //   sign: types.SignType.SecretKey,
  //   //   fromAccount: user1.account,
  //   //   appID: appInfo.appID,
  //   //   payFlags: {},
  //   //   appArgs: appArgs,
  //   // };

  //   const txs: algob.runtime.rtypes.TxReceipt[] = runtime.executeTx(createAssetTx);
  //   // console.log('====================================');
  //   // console.log(txs);
  //   // console.log('====================================');
  //   //const info = runtime.getApp(appInfo.appID);
  //   const infos = runtime.getAccount(appInfo.applicationAccount);
  //   const asset: number = Array.from(infos.assets.keys()).pop() ?? 0;

  //   const balance = runtime.getAssetHolding(asset, infos.address);
  //   console.log("====================================");
  //   console.log(balance);
  //   console.log("====================================");
  //   // //Transfer asset
  //   // const appArgs = ["str:transfer", algob.convert.addressToPk(user2.address)];
  //   // const appCallParams: types.ExecParams = {
  //   //   type: types.TransactionType.CallApp,
  //   //   sign: types.SignType.SecretKey,
  //   //   fromAccount: user1.account,
  //   //   appID: appInfo.appID,
  //   //   payFlags: {},
  //   //   appArgs: appArgs,
  //   // };

  //   // const txs: algob.runtime.rtypes.TxReceipt[] = runtime.executeTx([appCallParams]);
  //   // const tx = txs[0] as algob.runtime.rtypes.BaseTxReceipt;
  //   // const fee = BigInt(tx.txn.fee ?? 0);
  // });
});
