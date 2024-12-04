import { toNano, beginCell } from '@ton/core';
import { NftCollection } from '../../wrappers/NftCollection';
import { NetworkProvider } from '@ton/blueprint';
import { buildCollectionContentCell } from './utils/onChain';

export async function run(provider: NetworkProvider) {
    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const string_first = "https://ipfs.io/ipfs/QmXYJrBsTg4tELneGRupqVc1sL54ukKLTP4vJ2ZLVjrTQR/";
    let newContent = beginCell()
        .storeInt(OFFCHAIN_CONTENT_PREFIX, 8)
        .storeStringTail(string_first)
        .endCell();
    let init = provider.open(
        await NftCollection.fromInit(provider.sender().address!!, newContent, {
            $$type: "RoyaltyParams",
            numerator: 350n,
            denominator: 1000n,
            destination: provider.sender().address!!,
        })
    );

    await init.send(provider.sender(), { value: toNano("1") }, "Mint");

    await provider.waitForDeploy(init.address);
}
