import { Address, toNano } from '@ton/core';
import { StorageChange } from '../wrappers/StorageChange';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('StorageChange address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const storage_change = provider.open(StorageChange.fromAddress(address));

    const sBefore = await storage_change.getS();

    await storage_change.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Change',
            s: "Hello, world!"
        }
    );

    ui.write('Waiting for string to change...');

    let sAfter = await storage_change.getS();
    let attempt = 1;
    while (sAfter === sBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        sAfter = await storage_change.getS();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('String changed successfully!');
    ui.write(sAfter);
}
