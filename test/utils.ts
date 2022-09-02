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
  const creationArgs = [algob.convert.addressToPk(deployer.address), "str:75000"];

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

export { deployContract, createNFT };
