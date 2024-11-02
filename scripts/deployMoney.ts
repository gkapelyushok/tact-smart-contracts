import { toNano } from '@ton/core';
import { Money } from '../wrappers/Money';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const money = provider.open(await Money.fromInit());

    await money.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(money.address);
}
