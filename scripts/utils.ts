import { existsSync, readFileSync, writeFileSync } from "fs";
const DEPLOY_FILE_NAME = "deploy.json";
export default function saveDeployInfo(appName: string, deployInfo: Object) {
  if (existsSync(DEPLOY_FILE_NAME)) {
    const oldDeployInfo = readFileSync(DEPLOY_FILE_NAME);
    const oldData = JSON.parse(oldDeployInfo.toString());
    console.log(oldData);
    oldData[appName] = deployInfo;
    writeFileSync(DEPLOY_FILE_NAME, JSON.stringify(oldData));
  } else {
    writeFileSync(DEPLOY_FILE_NAME, JSON.stringify({ [appName]: deployInfo }));
  }
}
export { saveDeployInfo };
