import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Money } from '../wrappers/Money';
import '@ton/test-utils';

describe('Money', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let money: SandboxContract<Money>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        money = blockchain.openContract(await Money.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await money.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: money.address,
            deploy: true,
            success: true,
        }); 
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and simpleCounter are ready to use
    });

    it('should send approximately 1 TON to the contract (after gas fees)', async () => {
        const initialBalance = await money.getBalance();
        const result = await money.send(
            deployer.getSender(),
            { value: toNano('1') },
            null
        );
        const totalFees = result.transactions[1].totalFees.coins;
        const finalBalance = await money.getBalance();
        expect(finalBalance).toEqual(initialBalance + toNano('1') - totalFees);
        });

    it('should withdraw all money to owner', async () => {
        await money.send(
            deployer.getSender(),
            { value: toNano('1.5') },
            null
        );
        const lastSender = await money.getLastSender();
        expect(lastSender).toEqualAddress(deployer.address);
        const initialBalance = await money.getBalance();
        const initialDeployerBalance = await deployer.getBalance();
        const result = await money.send(
            deployer.getSender(),
            { value: toNano('0.05')},
            "withdraw"
        );
 
        const finalDeployerBalance = await deployer.getBalance();
        expect(finalDeployerBalance).toBeLessThan(initialDeployerBalance + initialBalance);
        expect(finalDeployerBalance).toBeGreaterThan(initialDeployerBalance + initialBalance - toNano('0.1'));
        printTransactionFees(result.transactions)

        const finalBalance = await money.getBalance();
        expect(finalBalance).toEqual(0n);
    });
});
