import { toNano } from '@ton/core';
import { MessageSender } from '../wrappers/MessageSender';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const message_sender = provider.open(await MessageSender.fromInit());

    await message_sender.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(message_sender.address);
}
