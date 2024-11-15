import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Address } from '@ton/core';
import { Lock } from '../wrappers/Lock';
import { LockChild } from '../wrappers/LockChild';
import { Token } from '../wrappers/Token';
import { TokenWallet } from '../wrappers/TokenWallet';
import { JettonMinter, jettonContentToCell } from '../wrappers/FuncToken';
import { JettonWallet } from '../wrappers/FuncJettonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';


describe('Lock', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lock: SandboxContract<Lock>;
    let token: SandboxContract<Token>;
    let funcToken: SandboxContract<JettonMinter>;
    


    beforeEach(async () => {
        blockchain = await Blockchain.create();

        lock = blockchain.openContract(await Lock.fromInit());

        deployer = await blockchain.treasury('deployer', {balance: toNano('100')});

        const lockDeployResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(lockDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            deploy: true,
            success: true,
        }); 

        token = blockchain.openContract(await Token.fromInit(deployer.address, null, 10n));

        const tokenDeployResult = await token.send(
            deployer.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );

        expect(tokenDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            deploy: true,
            success: true,
        });

        const defaultContent = jettonContentToCell({type: 1, uri: "https://testjetton.org/content.json"});
        const jwallet_code = await compile('FuncJettonWallet');
        const minter_code = await compile('FuncToken');
        funcToken  = blockchain.openContract(
            JettonMinter.createFromConfig(
              {
                admin: deployer.address,
                content: defaultContent,
                wallet_code: jwallet_code,
              },
              minter_code
            )
        );
        
        const funcTokenDeployResult = await funcToken.sendMint(
            deployer.getSender(),
            deployer.address,
            10000n,
            0n,
            toNano("1"),
        );
        // console.log("func");
        // printTransactionFees(funcTokenDeployResult.transactions);

        expect(funcTokenDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: funcToken.address,
            deploy: true,
            success: true,
        });

    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and Lock are ready to use
    });

    it('should lock and unlock my token', async () => {
        let treasurer1: SandboxContract<TreasuryContract> = 
            await blockchain.treasury('treasurer1', {balance: toNano('100')});
        
        await token.send(
            treasurer1.getSender(),
            { value: toNano('10') },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        let treasurer1Wallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(treasurer1.address)
        ));


        let lockChild = blockchain.openContract(await LockChild.fromInit(lock.address, treasurer1.address));
        
        let unlockResult = await lockChild.send(treasurer1.getSender(), {value: toNano("1")}, "unlock");

        expect(unlockResult.transactions).toHaveTransaction({
            from: treasurer1.address,
            to: lockChild.address,
            deploy: true,
            success: false,
            exitCode: 60507, // not locked amount
        });

        // printTransactionFees(unlockResult.transactions);
        let transferResult = await treasurer1Wallet.send(
            treasurer1.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'TokenTransfer',
                query_id: 0n,
                destination: lockChild.address,
                amount: 10000n,
                response_destination: treasurer1.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        // for (let i = 0; i < transferResult.transactions.length; i++) {
        //     console.log(transferResult.transactions[i].description);
        // }
        // printTransactionFees(transferResult.transactions);
        
        let lockChildWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(lockChild.address)
        ));

        expect((await lockChildWallet.getGetWalletData()).balance).toBe(9000n);
        expect(await lockChild.getGetLockedAmount()).toBe(9000n);

        let unlockResult2 = await lockChild.send(treasurer1.getSender(), {value: toNano("1")}, "unlock");
        // printTransactionFees(unlockResult2.transactions);
        expect(await lockChild.getGetLockedAmount()).toBe(0n);

        expect((await lockChildWallet.getGetWalletData()).balance).toBe(0n);
    }); 

    it("should lock and unlock func", async () =>{
        let userWallet = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await funcToken.getWalletAddress(address)
            )
        );

        let treasurer: SandboxContract<TreasuryContract> = 
            await blockchain.treasury('treasurer', {balance: toNano('100')});
        
        let treasurerWallet = await userWallet(treasurer.address);
        const tokenDeployResult = await funcToken.sendMint(
            deployer.getSender(),
            treasurer.address,
            10000n,
            0n,
            toNano("1"),
        );        
        
        let lockChild = blockchain.openContract(await LockChild.fromInit(lock.address, treasurer.address));
        let lockChildWallet = await userWallet(lockChild.address);

        let unlockResult = await lockChild.send(treasurer.getSender(), {value: toNano("1")}, "unlock");

        expect(unlockResult.transactions).toHaveTransaction({
            from: treasurer.address,
            to: lockChild.address,
            deploy: true,
            success: false,
            exitCode: 60507, // not locked amount
        });

        const transferResult = await treasurerWallet.sendTransfer(
            treasurer.getSender(),
            toNano("10"),
            1000n,
            lockChild.address,
            treasurer.address,
            beginCell().endCell(),
            toNano("0.2"),
            beginCell().endCell()
        );

        // printTransactionFees(transferResult.transactions);

        expect(transferResult.transactions).toHaveTransaction({
            from: treasurerWallet.address,
            to: lockChildWallet.address,
            success: true,
        });

        expect(await lockChildWallet.getJettonBalance()).toBe(1000n);
        expect(await lockChild.getGetLockedAmount()).toBe(1000n);

        let unlockResult2 = await lockChild.send(treasurer.getSender(), {value: toNano("1")}, "unlock");
        printTransactionFees(unlockResult2.transactions);
        expect(await lockChild.getGetLockedAmount()).toBe(0n);

        expect(await lockChildWallet.getJettonBalance()).toBe(0n);
    });
});