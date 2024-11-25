import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, toNano } from '@ton/core';
import { StakingMaster } from '../wrappers/StakingMaster';
import { StakingChild } from '../build/DeStaking/tact_StakingChild';
import { Token } from '../wrappers/Token';
import { TokenWallet } from '../wrappers/TokenWallet';
import '@ton/test-utils';


describe('Staking', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let staker: SandboxContract<TreasuryContract>;
    let stakingMasterContract: SandboxContract<StakingMaster>;
    let stakingChildContract: SandboxContract<StakingChild>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 500;
        deployer = await blockchain.treasury('deployer', {balance: toNano('100')});

    });
    
    it("should claim reward my token", async () => {
        staker = await blockchain.treasury('staker', {balance: toNano('100')});

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

        await token.send(
            staker.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        const stakerWallet = blockchain.openContract(TokenWallet.fromAddress(
                await token.getGetWalletAddress(staker.address)
        ));
        const deployerWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(deployer.address)
        ));

        console.log("Deploy token and mint to deployer: ");
        // printTransactionFees(tokenDeployResult.transactions);

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
        expect((await stakerWallet.getGetWalletData()).balance).toEqual(10000n);
        
        stakingMasterContract = blockchain.openContract(await StakingMaster.fromInit(deployer.address, 1000n));
        stakingChildContract = blockchain.openContract(await StakingChild.fromInit(stakingMasterContract.address, staker.address));
        let stakingWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(stakingMasterContract.address)
        ));
        await stakingMasterContract.send(deployer.getSender(), { value: toNano("1") }, null);
        await deployerWallet.send(
            deployer.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 500n,
                destination: stakingMasterContract.address,  
                response_destination: deployer.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        const transferResult = await stakerWallet.send(
            staker.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 100n,
                destination: stakingMasterContract.address,  
                response_destination: staker.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        // printTransactionFees(transferResult.transactions);
        expect(transferResult.transactions).toHaveTransaction({
            from: stakerWallet.address,
            to: stakingWallet.address,
            success: true,
        }); 

        // console.log(await stakingChildContract.getAmount());
        // console.log(await stakingChildContract.getReward());
        // console.log((await stakingWallet.getGetWalletData()).balance);

        blockchain.now = 100000000;

        // console.log(await stakingChildContract.getAmount());
        // console.log(await stakingChildContract.getReward());
        // console.log((await stakingWallet.getGetWalletData()).balance);

        const stakerBalanceBefore = (await stakerWallet.getGetWalletData()).balance
        const res = await stakingChildContract.send(staker.getSender(), { value: toNano("1")},
            {
                $$type: "ClaimReward",
            }
        );
        // console.log(await stakingChildContract.getAmount());
        // console.log(await stakingChildContract.getReward());
        // console.log((await stakingWallet.getGetWalletData()).balance);


        const apr = (amount: bigint, percent: bigint, durationTime: bigint) => { 
            return amount * percent * durationTime / (365n * 24n * 3600n * 10000n);
        };
        const stakerBalanceAfter = (await stakerWallet.getGetWalletData()).balance;
        let reward = apr(90n, 1000n, 100000000n - 500n);
        reward -= reward / 10n;
        expect(stakerBalanceAfter).toEqual(stakerBalanceBefore + reward);

        blockchain.now = 200000000;

        // console.log(await stakingChildContract.getAmount());
        // console.log(await stakingChildContract.getReward());
        // console.log((await stakingWallet.getGetWalletData()).balance);

        const stakerBalanceBefore2 = (await stakerWallet.getGetWalletData()).balance
        const res2 = await stakingChildContract.send(staker.getSender(), { value: toNano("1")},
            {
                $$type: "Unstake",
            }
        );


        const stakerBalanceAfter2 = (await stakerWallet.getGetWalletData()).balance;
        let reward2 = apr(90n, 1000n, 100000000n) + 90n;
        reward2 -= reward2 / 10n;
        expect(stakerBalanceAfter2).toEqual(stakerBalanceBefore2 + reward2);
    });
});