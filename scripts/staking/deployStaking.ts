import { toNano } from '@ton/core';
import { StakingContract } from '../../wrappers/Staking';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const stakingContract = provider.open(await StakingContract.fromInit(provider.sender().address!!, 10000n));

    await stakingContract.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(stakingContract.address);
}
