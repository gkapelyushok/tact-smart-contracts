import { toNano, beginCell, Dictionary } from '@ton/core';
import { NftCollection } from '../../build/NftOnchain/tact_NftCollection';
import { NetworkProvider } from '@ton/blueprint';
import { buildCollectionContentCell, setItemContentCell } from './utils/onChain';

export async function run(provider: NetworkProvider) {
    
    const collectionContentCell = buildCollectionContentCell({
        name: "OnChain collection",
        description: "Collection of items with onChain metadata",
        image: "https://ipfs.io/ipfs/QmSgP7ENtDe6xY6DZUz73ydeYmoopJYu3BywZJPSJ338zT"
    });

    const nftContentCell = setItemContentCell({
        name: "Sun",
        description: "Description Gosha NFT",
        image: "https://ipfs.io/ipfs/QmYZL5kTeWsJVAGDScb2aS1eaL8KxZPYoqMZrM5pUvDC47"
    });

    let init = provider.open(
        await NftCollection.fromInit(provider.sender().address!!, collectionContentCell, {
            $$type: "RoyaltyParams",
            numerator: 350n,
            denominator: 1000n,
            destination: provider.sender().address!!,
        })
    );

    await init.send(provider.sender(), { value: toNano("1") }, {$$type: "Mint", individual_content: nftContentCell});

    await provider.waitForDeploy(init.address);
}
