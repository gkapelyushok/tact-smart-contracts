import { toNano } from '@ton/core';
import { StorageChange } from '../../wrappers/StorageChange';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const storage_change = provider.open(await StorageChange.fromInit());

    await storage_change.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            query_id: 0n,
        }
    );

    await provider.waitForDeploy(storage_change.address);

}
