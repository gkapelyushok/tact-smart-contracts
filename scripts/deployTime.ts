import { toNano } from '@ton/core';
import { Time } from '../wrappers/Time';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const time = provider.open(await Time.fromInit());

    await time.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(time.address);

    const timeUnix = await time.getTimeUnix();
    const timeString = await time.getTimeString();
    console.log(`Current Unix timestamp: ${timeUnix}`);
    console.log(`Current time string: ${timeString}`);
}
