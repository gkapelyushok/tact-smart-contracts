import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Money } from '../wrappers/Money';
import '@ton/test-utils';

describe('SimpleCounter', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
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
    
        const finalBalance = await money.getBalance();
    
        const expectedMinIncrease = toNano('0.99'); 
        const expectedMaxIncrease = toNano('1');   

        const actualIncrease = finalBalance - initialBalance;

        expect(actualIncrease >= expectedMinIncrease && actualIncrease <= expectedMaxIncrease).toBe(true);
    });

    it('should withdraw all money to owner', async () => {
        const initialBalance = await money.getBalance();
        const result = await money.send(
            deployer.getSender(),
            { value: toNano('1.5') },
            null
        );
        const lastSender = await money.getLastSender();
        expect(lastSender === deployer.getSender().address);
        const initialDeployerBalance = await deployer.getBalance();
        await money.send(
            deployer.getSender(),
            { value: toNano('0.05')},
            "withdraw"
        );

        const finalBalance = await money.getBalance();
        expect(finalBalance <= toNano(0.11));
        const finalDeployerBalance = await deployer.getBalance();
        expect(finalDeployerBalance - initialDeployerBalance >= toNano(1.4));
    });


});
