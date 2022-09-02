import { StorageConfig } from "@algo-builder/web/build/types";
import * as algob from "@algo-builder/algob";
import { getSuggestedParams, types } from "@algo-builder/web";
import { AccountStore, getProgram, Runtime } from "@algo-builder/runtime";
import { Account } from "@algo-builder/algob/build/types";

function deployContract(runtime: Runtime, appName: string, deployer: AccountStore): algob.runtime.rtypes.AppInfo {
  const appStorageConfig: StorageConfig = {
    localInts: 1,
    localBytes: 1,
    globalInts: 8,
    globalBytes: 20,
    appName: appName,
  };
  const creationFlags = Object.assign({}, appStorageConfig);
  const creationArgs = [algob.convert.addressToPk(deployer.address), "int:750000"];

  const placeholderParam: algob.types.SCParams = {
    TMPL_NOMINAL_PRICE: 1000n,
    TMPL_MATURITY_DATE: BigInt(Math.round(new Date().getTime() / 1000) + 240),
  };

  const appInfo: algob.runtime.rtypes.AppInfo = runtime.deployApp(
    deployer.account,
    {
      ...creationFlags,
      appName: appName,
      metaType: types.MetaType.FILE,
      approvalProgramFilename: `${appName} - approval.teal`,
      clearProgramFilename: `${appName} - clear.teal`,
      appArgs: creationArgs,
    },
    {},
    placeholderParam
  );

  const minimumAlgoTx: types.ExecParams[] = [
    {
      type: types.TransactionType.TransferAlgo,
      sign: types.SignType.SecretKey,
      fromAccount: deployer.account,
      toAccountAddr: appInfo.applicationAccount,
      amountMicroAlgos: 100000,
      payFlags: { totalFee: 1000 },
    },
  ];
  runtime.executeTx(minimumAlgoTx);
  return appInfo;
}

function createNFT(runtime: Runtime, appId: number, creator: AccountStore): number {
  const appArgs = ["str:nft_create"];
  const createNFTTx: types.ExecParams[] = [
    {
      type: types.TransactionType.CallApp,
      sign: types.SignType.SecretKey,
      fromAccount: creator.account,
      appID: appId,
      payFlags: {},
      appArgs: appArgs,
    },
    {
      type: types.TransactionType.DeployASA,
      sign: types.SignType.SecretKey,
      fromAccount: creator.account,
      asaName: "ownify",
      payFlags: { totalFee: 1000 },
    },
  ];
  const txs = runtime.executeTx(createNFTTx);
  return (txs[1] as algob.runtime.rtypes.ASAInfo).assetIndex;
}

function bulkTransfer(runtime: Runtime, appId: number, feeCollector: string, user1: AccountStore, user2: AccountStore) {
  const createdAssetId = createNFT(runtime, appId, user1);
  //OptIn Asset
  runtime.optInToASA(createdAssetId, user2.address, {});
  const fee = runtime.getGlobalState(appId, "fee") as bigint;
  //transfer nft to user2.
  for (let index = 0; index < 100; index++) {
    const transferNftArgs = ["str:nft_transfer", algob.convert.addressToPk(user2.address)];
    const transferNFTTx: types.ExecParams[] = [
      {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: index % 2 == 0 ? user1.account : user2.account,
        appID: appId,
        payFlags: {},
        appArgs: transferNftArgs,
      },
      {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: index % 2 == 0 ? user1.account : user2.account,
        toAccountAddr: feeCollector,
        amountMicroAlgos: fee,
        payFlags: { totalFee: 1000 },
      },
      {
        type: types.TransactionType.TransferAsset,
        sign: types.SignType.SecretKey,
        fromAccount: index % 2 == 0 ? user1.account : user2.account,
        toAccountAddr: index % 2 == 0 ? user2.address : user1.address,
        amount: 1n,
        assetID: createdAssetId,
        payFlags: { totalFee: 1000 },
      },
    ];
    runtime.executeTx(transferNFTTx);
  }
}
const Utils = {
  hexStringToDecimal: (hex: Uint8Array) => {
    return parseInt(Buffer.from(hex).toString("hex"), 16);
  },
};

export { deployContract, createNFT, bulkTransfer, Utils };
