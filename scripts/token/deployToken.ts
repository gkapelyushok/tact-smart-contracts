import { toNano } from '@ton/core';
import { Token } from '../../wrappers/Token';
import { NetworkProvider } from '@ton/blueprint';
import {buildOnchainMetadata} from "./utils/jetton-helpers";


export async function run(provider: NetworkProvider) {
    const jettonParams = {
        name: "GSHA",
        description: "Description Gosha coin",
        symbol: "GSHA",
        image: "https://ipfs.io/ipfs/QmSgP7ENtDe6xY6DZUz73ydeYmoopJYu3BywZJPSJ338zT"
    };
    const content = buildOnchainMetadata(jettonParams)
    const token = provider.open(await Token.fromInit(provider.sender().address!, content, 10n));

    await token.send(
        provider.sender(),
        {
            value: toNano('1.5'),
        },
        {
            $$type: 'Mint',
            amount: 10000n
        }
    );

    await provider.waitForDeploy(token.address);

}
