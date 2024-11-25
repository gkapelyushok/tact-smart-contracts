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
    let staker: SandboxContract<TreasuryContract>;
    let stakingContract: SandboxContract<StakingContract>;

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
        expect((await stakerWallet.getGetWalletData()).balance).toEqual(10000n);
        
        stakingContract = blockchain.openContract(await StakingContract.fromInit(deployer.address, 1000n));
        let stakingWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(stakingContract.address)
        ));
        await stakingContract.send(deployer.getSender(), { value: toNano("1") }, null);
        await deployerWallet.send(
            deployer.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 500n,
                destination: stakingContract.address,  
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
                destination: stakingContract.address,  
                response_destination: staker.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        printTransactionFees(transferResult.transactions);
        expect(transferResult.transactions).toHaveTransaction({
            from: stakerWallet.address,
            to: stakingWallet.address,
            success: true,
        }); 

        // console.log(await stakingContract.getStakeAmount(0n));
        // console.log((await stakingWallet.getGetWalletData()).balance);

        blockchain.now = 100000000;
        const stakerBalanceBefore = (await stakerWallet.getGetWalletData()).balance
        const res = await stakingContract.send(staker.getSender(), { value: toNano("1")},
            {
                $$type: "ClaimReward",
                indexId: 0n,
            }
        );

        const apr = (amount: bigint, percent: bigint, durationTime: bigint) => { 
            return amount * percent * durationTime / (365n * 24n * 3600n * 10000n);
        };
        const stakerBalanceAfter = (await stakerWallet.getGetWalletData()).balance;
        const reward = apr(100n, 1000n, 100000000n - 500n);
        expect(stakerBalanceAfter).toEqual(stakerBalanceBefore + reward);

        blockchain.now = 200000000;
        const stakerBalanceBefore2 = (await stakerWallet.getGetWalletData()).balance
        const res2 = await stakingContract.send(staker.getSender(), { value: toNano("1")},
            {
                $$type: "Unstake",
                indexId: 0n,
            }
        );
        const stakerBalanceAfter2 = (await stakerWallet.getGetWalletData()).balance;
        const reward2 = apr(100n, 1000n, 100000000n);
        
        console.log(await stakingContract.getStakeAmount(0n));
        console.log((await stakingWallet.getGetWalletData()).balance);
        console.log(stakerBalanceAfter2);
        console.log(stakerBalanceBefore2 + 90n + reward2);
        expect(stakerBalanceAfter2).toEqual(stakerBalanceBefore2 + 90n + reward2);
    });
});