import { toNano, beginCell, Address } from '@ton/core';
import { NftCollection } from '../../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';
import { buildCollectionContentCell } from './utils/onChain';

export async function run(provider: NetworkProvider) {
    
    let init = provider.open(
        await NftCollection.fromAddress(
            Address.parse('EQAMe8L3VS-uhZGc--gPZnPcSlUUQRrB7rCQv5zkUOUt1y2U') // nftCollection address)
    ));

    await init.send(provider.sender(), { value: toNano("1") }, "Mint");
}
