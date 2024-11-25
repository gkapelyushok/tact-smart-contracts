import { Address, toNano } from '@ton/core';
import { Token } from '../../wrappers/Token';
import { NetworkProvider } from '@ton/blueprint';
import {buildOnchainMetadata} from "./utils/jetton-helpers";
import { JettonMinter, jettonContentToCell } from '../../wrappers/FuncToken';
import { JettonWallet } from '../../wrappers/FuncJettonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';


export async function run(provider: NetworkProvider) {
    const jettonParams = {
        name: "GSHA",
        description: "Description Gosha coin",
        symbol: "GSHA",
        image: "https://ipfs.io/ipfs/QmSgP7ENtDe6xY6DZUz73ydeYmoopJYu3BywZJPSJ338zT"
    };
    const content = buildOnchainMetadata(jettonParams)
    const jwallet_code = await compile('FuncJettonWallet');
    const minter_code = await compile('FuncToken');
    let funcToken  = provider.open(
        JettonMinter.createFromConfig(
            {
            admin: provider.sender().address!!,
            content: content,
            wallet_code: jwallet_code,
            },
            minter_code
        )
    );

    const tokenDeployResult = await funcToken.sendMint(
        provider.sender(),
        //Address.parse("EQBVDzdXsaZWfINuyqJSGh_btt4Yky2o8Jy6NwLXVQBtRLDw"),
        provider.sender().address!!,
        10000n,
        0n,
        toNano("1"),
    ); 

    await provider.waitForDeploy(funcToken.address);
           
}
