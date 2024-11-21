import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, toNano } from '@ton/core';
import { StakingContract } from '../wrappers/Staking';
import { Token } from '../wrappers/Token';
import { TokenWallet } from '../wrappers/TokenWallet';
import { JettonMinter, jettonContentToCell } from '../wrappers/FuncToken';
import { JettonWallet } from '../wrappers/FuncJettonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Staking', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let stakingContract: SandboxContract<StakingContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 500;
        deployer = await blockchain.treasury('deployer', {balance: toNano('100')});

    });
    
    it("should claim reward my token", async () => {
        let token = blockchain.openContract(await Token.fromInit(deployer.address, null, 10n));
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
        const deployerWallet = blockchain.openContract(TokenWallet.fromAddress(
                await token.getGetWalletAddress(deployer.address)
        ));
        

        console.log("Deploy token and mint to deployer: ");
        printTransactionFees(tokenDeployResult.transactions);

        expect(tokenDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: token.address,
            deploy: true,
            success: true,
        });
        expect(tokenDeployResult.transactions).toHaveTransaction({
            from: token.address,
            to: deployerWallet.address,
            deploy: true,
            success: true,
        });
        expect(tokenDeployResult.transactions).toHaveTransaction({
            from: deployerWallet.address,
            to: deployer.address,
            success: true
        });
        expect((await deployerWallet.getGetWalletData()).balance).toEqual(10000n);
        
        stakingContract = blockchain.openContract(await StakingContract.fromInit(deployer.address, 10n));
        let stakingWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(stakingContract.address)
        ));

        await stakingContract.send(deployer.getSender(), { value: toNano("1") }, null);
        const transferResult = await deployerWallet.send(
            deployer.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 100n,
                destination: stakingContract.address,  
                response_destination: deployer.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        printTransactionFees(transferResult.transactions);
        expect(transferResult.transactions).toHaveTransaction({
            from: deployerWallet.address,
            to: stakingWallet.address,
            deploy: true,
            success: true,
        }); 

        console.log(await stakingContract.getStakeAmount(0n));
        console.log((await stakingWallet.getGetWalletData()).balance);

        blockchain.now = 100000000;
        const deployerBalanceBefore = (await deployerWallet.getGetWalletData()).balance
        const res = await stakingContract.send(deployer.getSender(), { value: toNano("1")},
            {
                $$type: "ClaimReward",
                index_id: 0n,
            }
        );

        const apr = (amount: bigint, percent: bigint, durationTime: bigint) => { 
            return amount * percent * durationTime / (365n * 24n * 3600n * 100n);
        };
        const deployerBalanceAfter = (await deployerWallet.getGetWalletData()).balance;
        const reward = apr(100n, 10n, 100000000n - 500n);
        expect(deployerBalanceAfter).toEqual(deployerBalanceBefore + reward);
    });
});