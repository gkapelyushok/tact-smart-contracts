import { Address, toNano } from '@ton/core';
import { Money } from '../wrappers/Money';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('SimpleCounter address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const money = provider.open(Money.fromAddress(address));

    const balanceBefore = await money.getBalance();

    ui.write(`Balance: ${balanceBefore}`);

    await money.send(
        provider.sender(),
        {
            value: toNano(1.1)
        },
        null
    );
    ui.write('Waiting for balance to increase...');

    let balanceAfter = await money.getBalance();
    let attempt = 1;
    while (balanceAfter === balanceBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        balanceAfter = await money.getBalance();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Balance increased successfully!');

    ui.write(`Balance: ${balanceAfter}`);

}
