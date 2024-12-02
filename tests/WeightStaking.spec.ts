import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, toNano } from '@ton/core';
import { StakingMaster } from '../wrappers/WeightStakingMaster';
import { StakingChild } from '../build/WeightStaking/tact_StakingChild';
import { Token } from '../wrappers/Token';
import { TokenWallet } from '../wrappers/TokenWallet';
import '@ton/test-utils';
import { JettonMinter, jettonContentToCell } from '../wrappers/FuncToken';
import { JettonWallet } from '../wrappers/FuncJettonWallet';
import { compile } from '@ton/blueprint';


describe('Staking', () => {
    let blockchain: Blockchain;
    let deployerA: SandboxContract<TreasuryContract>;
    let deployerB: SandboxContract<TreasuryContract>;


    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployerA = await blockchain.treasury('deployerA1', {balance: toNano('1000')});
        deployerB = await blockchain.treasury('deployerA1', {balance: toNano('1000')});


    });
    
    it("different tokens for awards and stakes", async () => {
        const stakerA = await blockchain.treasury('stakerA', {balance: toNano('100')});
        const stakerB = await blockchain.treasury('stakerB', {balance: toNano('100')});
        const stakerC = await blockchain.treasury('stakerC', {balance: toNano('100')});

        const stakesToken = blockchain.openContract(await Token.fromInit(deployerA.address, null, 0n));
        const tokenDeployResult = await stakesToken.send(
            deployerA.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 100000n
            }
        );

        
        const deployerAWallet = blockchain.openContract(TokenWallet.fromAddress(
            await stakesToken.getGetWalletAddress(deployerA.address)
        ));

        await stakesToken.send(
            stakerA.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        const stakerAWallet = blockchain.openContract(TokenWallet.fromAddress(
                await stakesToken.getGetWalletAddress(stakerA.address)
        ));
        await stakesToken.send(
            stakerB.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        const stakerBWallet = blockchain.openContract(TokenWallet.fromAddress(
                await stakesToken.getGetWalletAddress(stakerB.address)
        ));
        
        const stakingMasterContract = blockchain.openContract(await StakingMaster.fromInit(deployerA.address));
        const stakingChildContractA = blockchain.openContract(await StakingChild.fromInit(stakingMasterContract.address, stakerA.address));
        const stakingChildContractB = blockchain.openContract(await StakingChild.fromInit(stakingMasterContract.address, stakerB.address));
        const stakingChildContractC = blockchain.openContract(await StakingChild.fromInit(stakingMasterContract.address, stakerC.address));


        let stakingWallet = blockchain.openContract(TokenWallet.fromAddress(
            await stakesToken.getGetWalletAddress(stakingMasterContract.address)
        ));
        await stakingMasterContract.send(deployerA.getSender(), { value: toNano("1") }, null);
        

        const transferAResult = await stakerAWallet.send(
            stakerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 100n,
                destination: stakingMasterContract.address,  
                response_destination: stakerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        expect(transferAResult.transactions).toHaveTransaction({
            from: stakerAWallet.address,
            to: stakingWallet.address,
            success: true,
        }); 

        const transferBResult = await stakerBWallet.send(
            stakerB.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 300n,
                destination: stakingMasterContract.address,  
                response_destination: stakerB.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        const defaultContent = jettonContentToCell({type: 1, uri: "https://testjetton.org/content.json"});
        const jwallet_code = await compile('FuncJettonWallet');
        const minter_code = await compile('FuncToken');
        const rewardsToken  = blockchain.openContract(
            JettonMinter.createFromConfig(
              {
                admin: deployerA.address,
                content: defaultContent,
                wallet_code: jwallet_code,
              },
              minter_code
            )
        );
        
        const rewardsTokenDeployResult = await rewardsToken.sendMint(
            deployerA.getSender(),
            deployerA.address,
            100000n,
            0n,
            toNano("1"),
        );



        let rewardsWallet = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await rewardsToken.getWalletAddress(address)
            )
        );

        const rewardsWalletDeployerA = await rewardsWallet(deployerA.address);
        const rewardsWalletStakerA = await rewardsWallet(stakerA.address);
        const rewardsWalletStakerB = await rewardsWallet(stakerB.address);
        const rewardsWalletStakerC = await rewardsWallet(stakerC.address);

        const rewardsWalletATokenDeployResult = await rewardsToken.sendMint(
            deployerA.getSender(),
            stakerA.address,
            1n,
            0n,
            toNano("1"),
        );
        const rewardsWalletBTokenDeployResult = await rewardsToken.sendMint(
            deployerA.getSender(),
            stakerB.address,
            1n,
            0n,
            toNano("1"),
        );
        const rewardsWalletCTokenDeployResult = await rewardsToken.sendMint(
            deployerA.getSender(),
            stakerC.address,
            1n,
            0n,
            toNano("1"),
        );

        const mintRewardResult = await rewardsWalletDeployerA.sendTransfer(
            deployerA.getSender(),
            toNano("10"),
            10000n,
            stakingMasterContract.address,
            deployerA.address,
            beginCell().endCell(),
            toNano("0.2"),
            beginCell().endCell()
        );


        const stakerABalanceBefore = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceBefore = (await stakerBWallet.getGetWalletData()).balance;

        const stakerARewardsBalanceBefore = await rewardsWalletStakerA.getJettonBalance();
        const stakerBRewardsBalanceBefore = await rewardsWalletStakerB.getJettonBalance();

        const claimRewardAResult = await stakingChildContractA.send(stakerA.getSender(), { value: toNano("1")}, { $$type: "ClaimReward" });
        const claimRewardBResult = await stakingChildContractB.send(stakerB.getSender(), { value: toNano("1")}, { $$type: "ClaimReward" });

        const stakerABalanceAfter = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceAfter = (await stakerBWallet.getGetWalletData()).balance;

        const stakerARewardsBalanceAfter = await rewardsWalletStakerA.getJettonBalance();
        const stakerBRewardsBalanceAfter = await rewardsWalletStakerB.getJettonBalance();

        expect (stakerABalanceAfter).toEqual(stakerABalanceBefore);
        expect (stakerBBalanceAfter).toEqual(stakerBBalanceBefore);

        expect (stakerARewardsBalanceAfter).toEqual(stakerARewardsBalanceBefore + 10000n * 100n / 400n);
        expect (stakerBRewardsBalanceAfter).toEqual(stakerBRewardsBalanceBefore + 10000n * 300n / 400n);

        await stakesToken.send(
            stakerC.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        const stakerCWallet = blockchain.openContract(TokenWallet.fromAddress(
            await stakesToken.getGetWalletAddress(stakerC.address)
        ));

        const transferCResult = await stakerCWallet.send(
            stakerC.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 400n,
                destination: stakingMasterContract.address,  
                response_destination: stakerC.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );



        const mintRewardResult2 = await rewardsWalletDeployerA.sendTransfer(
            deployerA.getSender(),
            toNano("10"),
            30000n,
            stakingMasterContract.address,
            deployerA.address,
            beginCell().endCell(),
            toNano("0.2"),
            beginCell().endCell()
        );

        const stakerABalanceBefore2 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceBefore2 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceBefore2 = (await stakerCWallet.getGetWalletData()).balance;

        const stakerARewardsBalanceBefore2 = await rewardsWalletStakerA.getJettonBalance();
        const stakerBRewardsBalanceBefore2 = await rewardsWalletStakerB.getJettonBalance();
        const stakerCRewardsBalanceBefore2 = await rewardsWalletStakerC.getJettonBalance();

        const claimRewardAResult2 = await stakingChildContractA.send(stakerA.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });
        const claimRewardBResult2 = await stakingChildContractB.send(stakerB.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });
        const claimRewardCResult2 = await stakingChildContractC.send(stakerC.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });


        const stakerABalanceAfter2 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceAfter2 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceAfter2 = (await stakerCWallet.getGetWalletData()).balance;

        const stakerARewardsBalanceAfter2 = await rewardsWalletStakerA.getJettonBalance();
        const stakerBRewardsBalanceAfter2 = await rewardsWalletStakerB.getJettonBalance();
        const stakerCRewardsBalanceAfter2 = await rewardsWalletStakerC.getJettonBalance();

        expect (stakerABalanceAfter2).toEqual(stakerABalanceBefore2);
        expect (stakerBBalanceAfter2).toEqual(stakerBBalanceBefore2);
        expect (stakerCBalanceAfter2).toEqual(stakerCBalanceBefore2);
        
        expect (stakerARewardsBalanceAfter2).toEqual(stakerARewardsBalanceBefore2 + 30000n * 100n / 800n);
        expect (stakerBRewardsBalanceAfter2).toEqual(stakerBRewardsBalanceBefore2 + 30000n * 300n / 800n);
        expect (stakerCRewardsBalanceAfter2).toEqual(stakerCRewardsBalanceBefore2 + 30000n * 400n / 800n);
        
        
        const mintRewardResult3 = await rewardsWalletDeployerA.sendTransfer(
            deployerA.getSender(),
            toNano("10"),
            40000n,
            stakingMasterContract.address,
            deployerA.address,
            beginCell().endCell(),
            toNano("0.2"),
            beginCell().endCell()
        );


        const stakerABalanceBefore3 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceBefore3 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceBefore3 = (await stakerCWallet.getGetWalletData()).balance;

        const stakerARewardsBalanceBefore3 = await rewardsWalletStakerA.getJettonBalance();
        const stakerBRewardsBalanceBefore3 = await rewardsWalletStakerB.getJettonBalance();
        const stakerCRewardsBalanceBefore3 = await rewardsWalletStakerC.getJettonBalance();

        const claimRewardAResult3 = await stakingChildContractA.send(stakerA.getSender(), { value: toNano("2")}, { $$type: "Unstake" });
        const claimRewardBResult3 = await stakingChildContractB.send(stakerB.getSender(), { value: toNano("2")}, { $$type: "Unstake" });
        const claimRewardCResult3 = await stakingChildContractC.send(stakerC.getSender(), { value: toNano("2")}, { $$type: "Unstake" });


        const stakerABalanceAfter3 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceAfter3 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceAfter3 = (await stakerCWallet.getGetWalletData()).balance;

        const stakerARewardsBalanceAfter3 = await rewardsWalletStakerA.getJettonBalance();
        const stakerBRewardsBalanceAfter3 = await rewardsWalletStakerB.getJettonBalance();
        const stakerCRewardsBalanceAfter3 = await rewardsWalletStakerC.getJettonBalance();

        expect (stakerABalanceAfter3).toEqual(stakerABalanceBefore3 + 100n);
        expect (stakerBBalanceAfter3).toEqual(stakerBBalanceBefore3 + 300n);
        expect (stakerCBalanceAfter3).toEqual(stakerCBalanceBefore3 + 400n);  
        
        expect (stakerARewardsBalanceAfter3).toEqual(stakerARewardsBalanceBefore3 + 40000n * 100n / 800n);
        expect (stakerBRewardsBalanceAfter3).toEqual(stakerBRewardsBalanceBefore3 + 40000n * 300n / 800n);
        expect (stakerCRewardsBalanceAfter3).toEqual(stakerCRewardsBalanceBefore3 + 40000n * 400n / 800n);
    });

    it("one token for awards and stakes", async () => {
        const stakerA = await blockchain.treasury('stakerA', {balance: toNano('100')});
        const stakerB = await blockchain.treasury('stakerB', {balance: toNano('100')});
        const stakerC = await blockchain.treasury('stakerC', {balance: toNano('100')});

        const token = blockchain.openContract(await Token.fromInit(deployerA.address, null, 0n));
        const tokenDeployResult = await token.send(
            deployerA.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 100000n
            }
        );
        
        const deployerAWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(deployerA.address)
        ));

        await token.send(
            stakerA.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        const stakerAWallet = blockchain.openContract(TokenWallet.fromAddress(
                await token.getGetWalletAddress(stakerA.address)
        ));
        await token.send(
            stakerB.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        const stakerBWallet = blockchain.openContract(TokenWallet.fromAddress(
                await token.getGetWalletAddress(stakerB.address)
        ));
        
        const stakingMasterContract = blockchain.openContract(await StakingMaster.fromInit(deployerA.address));
        const stakingChildContractA = blockchain.openContract(await StakingChild.fromInit(stakingMasterContract.address, stakerA.address));
        const stakingChildContractB = blockchain.openContract(await StakingChild.fromInit(stakingMasterContract.address, stakerB.address));
        const stakingChildContractC = blockchain.openContract(await StakingChild.fromInit(stakingMasterContract.address, stakerC.address));


        let stakingWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(stakingMasterContract.address)
        ));
        await stakingMasterContract.send(deployerA.getSender(), { value: toNano("1") }, null);
        

        const transferAResult = await stakerAWallet.send(
            stakerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 100n,
                destination: stakingMasterContract.address,  
                response_destination: stakerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        expect(transferAResult.transactions).toHaveTransaction({
            from: stakerAWallet.address,
            to: stakingWallet.address,
            success: true,
        }); 

        const transferBResult = await stakerBWallet.send(
            stakerB.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 300n,
                destination: stakingMasterContract.address,  
                response_destination: stakerB.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        const mintRewardResult = await deployerAWallet.send(
            deployerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 10000n,
                destination: stakingMasterContract.address,  
                response_destination: deployerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );
        const stakerABalanceBefore = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceBefore = (await stakerBWallet.getGetWalletData()).balance;

        const claimRewardAResult = await stakingChildContractA.send(stakerA.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });
        const claimRewardBResult = await stakingChildContractB.send(stakerB.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });

        const stakerABalanceAfter = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceAfter = (await stakerBWallet.getGetWalletData()).balance;

        expect (stakerABalanceAfter).toEqual(stakerABalanceBefore + 10000n * 100n / 400n);
        expect (stakerBBalanceAfter).toEqual(stakerBBalanceBefore + 10000n * 300n / 400n);

        await token.send(
            stakerC.getSender(),
            {
                value: toNano('10'),
            },
            {
                $$type: 'Mint',
                amount: 10000n
            }
        );
        const stakerCWallet = blockchain.openContract(TokenWallet.fromAddress(
            await token.getGetWalletAddress(stakerC.address)
        ));

        const transferCResult = await stakerCWallet.send(
            stakerC.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 400n,
                destination: stakingMasterContract.address,  
                response_destination: stakerC.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );


        const mintRewardResult2 = await deployerAWallet.send(
            deployerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 30000n,
                destination: stakingMasterContract.address,  
                response_destination: deployerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        const stakerABalanceBefore2 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceBefore2 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceBefore2 = (await stakerCWallet.getGetWalletData()).balance;

        const claimRewardAResult2 = await stakingChildContractA.send(stakerA.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });
        const claimRewardBResult2 = await stakingChildContractB.send(stakerB.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });
        const claimRewardCResult2 = await stakingChildContractC.send(stakerC.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });


        const stakerABalanceAfter2 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceAfter2 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceAfter2 = (await stakerCWallet.getGetWalletData()).balance;

        expect (stakerABalanceAfter2).toEqual(stakerABalanceBefore2 + 30000n * 100n / 800n);
        expect (stakerBBalanceAfter2).toEqual(stakerBBalanceBefore2 + 30000n * 300n / 800n);
        expect (stakerCBalanceAfter2).toEqual(stakerCBalanceBefore2 + 30000n * 400n / 800n);   
        
        
        const mintRewardResult3 = await deployerAWallet.send(
            deployerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 40000n,
                destination: stakingMasterContract.address,  
                response_destination: deployerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        const stakerABalanceBefore3 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceBefore3 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceBefore3 = (await stakerCWallet.getGetWalletData()).balance;

        const claimRewardAResult3 = await stakingChildContractA.send(stakerA.getSender(), { value: toNano("2")}, { $$type: "Unstake" });
        const claimRewardBResult3 = await stakingChildContractB.send(stakerB.getSender(), { value: toNano("2")}, { $$type: "Unstake" });
        const claimRewardCResult3 = await stakingChildContractC.send(stakerC.getSender(), { value: toNano("2")}, { $$type: "Unstake" });

        const stakerABalanceAfter3 = (await stakerAWallet.getGetWalletData()).balance;
        const stakerBBalanceAfter3 = (await stakerBWallet.getGetWalletData()).balance;
        const stakerCBalanceAfter3 = (await stakerCWallet.getGetWalletData()).balance;

        expect (stakerABalanceAfter3).toEqual(stakerABalanceBefore3 + 40000n * 100n / 800n + 100n);
        expect (stakerBBalanceAfter3).toEqual(stakerBBalanceBefore3 + 40000n * 300n / 800n + 300n);
        expect (stakerCBalanceAfter3).toEqual(stakerCBalanceBefore3 + 40000n * 400n / 800n + 400n);

        const transferAResult2 = await stakerAWallet.send(
            stakerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 100n,
                destination: stakingMasterContract.address,  
                response_destination: stakerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );


        
        const mintRewardResult4 = await deployerAWallet.send(
            deployerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 10000n,
                destination: stakingMasterContract.address,  
                response_destination: deployerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        const transferAResult3 = await stakerAWallet.send(
            stakerA.getSender(),
            { value: toNano('10') },
            {
                $$type: "TokenTransfer",
                query_id: 0n,
                amount: 100n,
                destination: stakingMasterContract.address,  
                response_destination: stakerA.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.2'),
                forward_payload: beginCell().endCell().asSlice(),
            }
        );

        const stakerABalanceBefore4 = (await stakerAWallet.getGetWalletData()).balance;

        const claimRewardAResult4 = await stakingChildContractA.send(stakerA.getSender(), { value: toNano("2")}, { $$type: "ClaimReward" });

        const stakerABalanceAfter4 = (await stakerAWallet.getGetWalletData()).balance;

        expect(stakerABalanceAfter4).toEqual(stakerABalanceBefore4 + 10000n);
    });
});