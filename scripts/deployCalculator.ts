import { toNano } from '@ton/core';
import { Calculator } from '../wrappers/Calculator';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const calculator = provider.open(await Calculator.fromInit());

    await calculator.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(calculator.address);

}
