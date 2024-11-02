import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { MessageSender } from '../wrappers/MessageSender';
import '@ton/test-utils';

describe('SimpleCounter', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let messageSender: SandboxContract<MessageSender>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        messageSender = blockchain.openContract(await MessageSender.fromInit());

        deployer = await blockchain.treasury('deployer');
        admin = await blockchain.treasury('admin');

        const deployResult = await messageSender.send(
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
            to: messageSender.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and simpleCounter are ready to use
    });

    it('should increment by owner', async () => {
        await messageSender.send(
            deployer.getSender(),
            {value: toNano('0.05')},
            "increment"
        )
        const i = await messageSender.getI();
        expect(i).toBe(1n);
    });

    it('should fail if increment not by owner', async () => {
        await expect(
            messageSender.send(
                admin.getSender(),
                {value: toNano('0.05')},
                "increment"
            )
        );

        const i = await messageSender.getI();
        expect(i).toBe(0n);
    });

    it('should transfer admin and increment by admin', async () => {
        await messageSender.send(
            deployer.getSender(),
            {value: toNano('0.05')},
            {
                $$type: 'Admin',
                admin: admin.getSender().address,
            }
        );
        await messageSender.send(
            admin.getSender(),
            {value: toNano('0.05')},
            "increment"
        )
        const i = await messageSender.getI();
        expect(i).toBe(1n);
    });
});
