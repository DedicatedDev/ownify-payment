import { AccountStore, getProgram, Runtime } from "@algo-builder/runtime";
import { getSuggestedParams, types } from "@algo-builder/web";
import { LogicSigAccount } from "algosdk";
import { assert, expect } from "chai";
import * as algob from "@algo-builder/algob";
import { readFileSync } from "fs";
import { StorageConfig } from "@algo-builder/web/build/types";
import { deployContract, createNFT } from "./utils";

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

  beforeEach(async function () {
    master = new AccountStore(initialBalance);
    contractAdmin = new AccountStore(0);
    user1 = new AccountStore(initialBalance);
    user2 = new AccountStore(initialBalance);
    runtime = new Runtime([master, user1, user2]);
    appInfo = deployContract(runtime, "payment", master);
  });

  describe("Asset management", () => {
    describe("create nft", () => {
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
      it("Should reject to create nft with invalid tx structure (Tx type)", () => {
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
      it("Should reject to create nft with invalid tx structure (Tx length)", () => {
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
        ];
        assert.throw(() => runtime.executeTx(createNFTTx));
      });
    });

    describe("transfer nft", () => {
      it("Should transfer nft", () => {
        const createdAssetId = createNFT(runtime, appInfo.appID, user1);
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
      it("Should reject to transfer nft with invalid tx structure (Tx type)", () => {
        const createdAssetId = createNFT(runtime, appInfo.appID, user1);
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
            type: types.TransactionType.TransferAsset,
            sign: types.SignType.SecretKey,
            fromAccount: user1.account,
            toAccountAddr: user2.address,
            amount: 2n,
            assetID: createdAssetId,
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
        assert.throw(() => runtime.executeTx(transferNFTTx));
      });
      it("Should reject to transfer nft with invalid tx structure (Tx length)", () => {
        const createdAssetId = createNFT(runtime, appInfo.appID, user1);
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
            type: types.TransactionType.TransferAsset,
            sign: types.SignType.SecretKey,
            fromAccount: user1.account,
            toAccountAddr: user2.address,
            amount: 1n,
            assetID: createdAssetId,
            payFlags: { totalFee: 1000 },
          },
        ];
        assert.throw(() => runtime.executeTx(transferNFTTx));
      });
      it("Should reject to transfer nft with invalid fee", () => {
        const createdAssetId = createNFT(runtime, appInfo.appID, user1);
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
            amountMicroAlgos: 70000,
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
        assert.throw(() => runtime.executeTx(transferNFTTx));
      });
      it("Should reject to transfer nft with invalid fee collector", () => {
        const createdAssetId = createNFT(runtime, appInfo.appID, user1);
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
            payFlags: {
              rekeyTo: user2.address,
            },
            appArgs: transferNftArgs,
          },
          {
            type: types.TransactionType.TransferAlgo,
            sign: types.SignType.SecretKey,
            fromAccount: user1.account,
            toAccountAddr: user2.address,
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
        assert.throw(() => runtime.executeTx(transferNFTTx));
      });
      it("Should reject to transfer nft with rekey", () => {
        const createdAssetId = createNFT(runtime, appInfo.appID, user1);
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
            payFlags: {
              rekeyTo: user2.address,
            },
            appArgs: transferNftArgs,
          },
          {
            type: types.TransactionType.TransferAlgo,
            sign: types.SignType.SecretKey,
            fromAccount: user1.account,
            toAccountAddr: appInfo.applicationAccount,
            amountMicroAlgos: 70000,
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
        assert.throw(() => runtime.executeTx(transferNFTTx));
      });
    });
  });

  describe("App Owner", () => {
    describe("Admin Management", () => {
      it("Should set admin", async () => {
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
        assert.deepEqual(runtime.getGlobalState(appInfo.appID, "admin"), algob.convert.addressToPk(user2.address));
      });
      it("Should reject to set admin by none app owner", async () => {
        const appArgs = ["str:set admin", algob.convert.addressToPk(user2.address)]; // converts algorand address to Uint8Array
        const appCallParams: types.ExecParams = {
          type: types.TransactionType.CallApp,
          sign: types.SignType.SecretKey,
          fromAccount: user2.account,
          appID: appInfo.appID,
          payFlags: {},
          appArgs: appArgs,
        };
        assert.throw(() => runtime.executeTx([appCallParams]));
      });
      it("Should reject to set invalid address", async () => {
        const appArgs = ["str:set admin", "str:test"]; // converts algorand address to Uint8Array
        const appCallParams: types.ExecParams = {
          type: types.TransactionType.CallApp,
          sign: types.SignType.SecretKey,
          fromAccount: user2.account,
          appID: appInfo.appID,
          payFlags: {},
          appArgs: appArgs,
        };
        assert.throw(() => runtime.executeTx([appCallParams]));
      });
    });

    describe("Fee management", () => {
      it("Should set fee function", async () => {
        const appArgs = ["str:set fee", "str:7000"];
        const appCallParams: types.ExecParams = {
          type: types.TransactionType.CallApp,
          sign: types.SignType.SecretKey,
          fromAccount: master.account,
          appID: appInfo.appID,
          payFlags: {},
          appArgs: appArgs,
        };
        runtime.executeTx([appCallParams]);
        assert.equal(runtime.getGlobalState(appInfo.appID, "fee")?.toString(), "7000");
      });
      it("Should reject to set fee function by none app owner", async () => {
        const appArgs = ["str:set fee", "str:7000"];
        const appCallParams: types.ExecParams = {
          type: types.TransactionType.CallApp,
          sign: types.SignType.SecretKey,
          fromAccount: user2.account,
          appID: appInfo.appID,
          payFlags: {},
          appArgs: appArgs,
        };
        assert.throw(()=>runtime.executeTx([appCallParams]));
      });
      it("Should reject to set fee function by invalid value", async () => {
        const appArgs = ["str:set fee", "str:test"];
        const appCallParams: types.ExecParams = {
          type: types.TransactionType.CallApp,
          sign: types.SignType.SecretKey,
          fromAccount: user2.account,
          appID: appInfo.appID,
          payFlags: {},
          appArgs: appArgs,
        };
        assert.throw(()=>runtime.executeTx([appCallParams]));
      });
      it("Should reject to set fee function by zero fee", async () => {
        const appArgs = ["str:set fee", "str:0"];
        const appCallParams: types.ExecParams = {
          type: types.TransactionType.CallApp,
          sign: types.SignType.SecretKey,
          fromAccount: user2.account,
          appID: appInfo.appID,
          payFlags: {},
          appArgs: appArgs,
        };
        assert.throw(()=>runtime.executeTx([appCallParams]));
      });
    });
  });
});
