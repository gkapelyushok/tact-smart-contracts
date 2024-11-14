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
        deployer = await blockchain.treasury('deployer', {balance: toNano('100')});
    });
    
    it("my token", async () => {
        let token = blockchain.openContract(await Token.fromInit(deployer.address, null, 1n));
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
        
        stakingContract = blockchain.openContract(await StakingContract.fromInit(deployer.address, 1n));
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



        let stakingData = await stakingContract.getGetReturnStakingData();
        let userStakeAmount = await stakingContract.getGetUserStakeAmount();
        let userStakeRecord = await stakingContract.getGetUserStakeRecord();
        console.log("userStakeRecord", userStakeRecord)
        for (const a in userStakeAmount) {
            console.log(a);
        }
       
        console.log("stakingData.index", stakingData.index);
        console.log("stakingData.parameter", stakingData.parameter);
        console.log("stakingData.this_contract_jettonWallet", stakingData.this_contract_jettonWallet);
        console.log("stakingData.total_score", stakingData.total_score);
    });

    it("func token", async () => {
        const defaultContent = jettonContentToCell({type: 1, uri: "https://testjetton.org/content.json"});
        const jwallet_code   = await compile('FuncJettonWallet');
        const minter_code    = await compile('FuncToken');
        const jettonMinter   = blockchain.openContract(
            JettonMinter.createFromConfig(
              {
                admin: deployer.address,
                content: defaultContent,
                wallet_code: jwallet_code,
              },
              minter_code
            )
        );
        
        const tokenDeployResult = await jettonMinter.sendMint(
            deployer.getSender(),
            deployer.address,
            10000n,
            0n,
            toNano("1"),
        );

        printTransactionFees(tokenDeployResult.transactions);

        let userWallet = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
              await jettonMinter.getWalletAddress(address)
            )
       );

        const deployerWallet = await userWallet(deployer.address);
        expect(await deployerWallet.getJettonBalance()).toEqual(10000n);


        // stakingWalletAddress should be in init!
        stakingContract = blockchain.openContract(await StakingContract.fromInit(deployer.address, 1n));
        console.log(deployer.address);
        let stakingWallet = await userWallet(stakingContract.address);


        await stakingContract.send(deployer.getSender(), { value: toNano("1") }, null);

        const transferResult = await deployerWallet.sendTransfer(
            deployer.getSender(),
            toNano("10"),
            100n,
            stakingContract.address,
            deployer.address,
            beginCell().endCell(),
            toNano("0.2"),
            beginCell().endCell()
        );
        printTransactionFees(transferResult.transactions);
        
        


        let stakingData = await stakingContract.getGetReturnStakingData();
        let userStakeAmount = await stakingContract.getGetUserStakeAmount();
        let userStakeRecord = await stakingContract.getGetUserStakeRecord();
        console.log("userStakeRecord", userStakeRecord)
        for (const a in userStakeAmount) {
            console.log(a);
        }
       
        console.log("stakingData.index", stakingData.index);
        console.log("stakingData.parameter", stakingData.parameter);
        console.log("stakingData.this_contract_jettonWallet", stakingData.this_contract_jettonWallet);
        console.log("stakingData.total_score", stakingData.total_score);
    });
});