import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell } from '@ton/core';
import { Token } from '../wrappers/Token';
import { TokenWallet } from '../wrappers/TokenWallet';
import '@ton/test-utils';

describe('Token', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let token: SandboxContract<Token>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');


        token = blockchain.openContract(await Token.fromInit(deployer.address, null, 10n));
        // const deployerBalance1 = await deployer.getBalance();
        
        const deployResult = await token.send(
            deployer.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            deploy: true,
            success: true,
        });
       
        // const deployerBalance2 = await deployer.getBalance();
        // console.log(deployerBalance1, deployerBalance2);

        // printTransactionFees(deployResult.transactions);

        const deployerWalletAddress = await token.getGetWalletAddress(deployer.address);
        const deployerWallet = blockchain.openContract(TokenWallet.fromAddress(deployerWalletAddress));
        expect((await deployerWallet.getGetWalletData()).balance).toEqual(10000n);
        expect(deployResult.transactions).toHaveTransaction({
            from: deployerWalletAddress,
            to: deployer.address,
            success: true
        });
        // console.log("deployerAdress: ", deployer.address);
        // console.log("deployWalletAddress: ", deployerWalletAddress);
        // console.log((await deployerWallet.getGetWalletData()).balance);
    });

    it("should deploy", async () => {});

    it("should mint tokens", async () => {
        const tokenWalletAddress = await token.getGetWalletAddress(deployer.address);
        const tokenWallet = blockchain.openContract(TokenWallet.fromAddress(tokenWalletAddress));
        const balanceBefore = (await tokenWallet.getGetWalletData()).balance;
        const totalSupplyBefore = (await token.getGetJettonData()).totalSupply;        
        const mintResult = await token.send(
            deployer.getSender(), 
            { value: toNano('1.5') }, 
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );

        // printTransactionFees(mintResult.transactions);
        expect(mintResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            success: true,
        });

        const totalSupplyAfter = (await token.getGetJettonData()).totalSupply;
        expect(totalSupplyAfter).toEqual(totalSupplyBefore + 10000n);

        const balanceAfter = (await tokenWallet.getGetWalletData()).balance;
        expect(balanceAfter).toEqual(balanceBefore + 10000n);
    });

    it("should transfer with fee to contract owner", async () => {
        const sender = await blockchain.treasury('sender');
        const receiver = await blockchain.treasury('receiver');
        const senderWalletAddress = await token.getGetWalletAddress(sender.address);
        const senderWallet = blockchain.openContract(TokenWallet.fromAddress(senderWalletAddress));
        const receiverWalletAddress = await token.getGetWalletAddress(receiver.address);
        const receiverWallet = blockchain.openContract(TokenWallet.fromAddress(receiverWalletAddress));
        const ownerWalletAddress = await token.getGetWalletAddress(deployer.address);
        const ownerWallet = blockchain.openContract(TokenWallet.fromAddress(ownerWalletAddress));

        const mintResult = await token.send(
            sender.getSender(), 
            { value: toNano('1') }, 
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );

        expect(mintResult.transactions).toHaveTransaction({
            from: sender.address,
            to: token.address,
            success: true,
        });

        // const deployerBalance = (await ownerWallet.getGetWalletData()).balance;
        // expect(deployerBalance).toEqual(10000n);

        const senderBalanceBefore = (await senderWallet.getGetWalletData()).balance;
        expect(senderBalanceBefore).toEqual(10000n)
        const ownerBalanceBefore = (await ownerWallet.getGetWalletData()).balance;

        const transferResult = await senderWallet.send(
            sender.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                queryId: 0n,
                amount: 100n,
                destination: receiver.address,  
                responseDestination: sender.address,
                customPayload: null,
                forwardTonAmount: toNano('0.1'),
                forwardPayload: beginCell().endCell().asSlice(),
            }
        );
        // printTransactionFees(transferResult.transactions);
        // expect(transferResult.transactions).toHaveTransaction({
        //     from: sender.address,
        //     to: senderWallet.address,
        //     success: true,
        // });
        

        const senderBalanceAfter = (await senderWallet.getGetWalletData()).balance;
        // console.log("senderBalanceBefore: ", senderBalanceBefore);
        // console.log("senderBalanceAfter: ", senderBalanceAfter);
        const receiverBalanceAfter = (await receiverWallet.getGetWalletData()).balance;
        const ownerBalanceAfter = (await ownerWallet.getGetWalletData()).balance;

        expect(senderBalanceAfter).toEqual(senderBalanceBefore - 100n);
        expect(receiverBalanceAfter).toEqual(90n);
        expect(ownerBalanceAfter).toEqual(ownerBalanceBefore + 10n);
    });

    it("should fail if Transfer.percent too large", async () => {
        token = blockchain.openContract(await Token.fromInit(deployer.address, null, 90n));
        const deployResult = await token.send(
            deployer.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            deploy: true,
            success: false,
            exitCode: 24321,
        });
    });

});