import "./jetton/messages";

message Stake {
    amount: Int;
    accumulator: Int;
}

message SendTokens {
    lastUpdatedAccumulator: Int;
    stakedAmount: Int;
    reward: Int;
    unstake: Bool;
    to: Address;
}

message UpdateAccumulator {
    accumulator: Int;
}

message ClaimReward {}

message Unstake {}

contract StakingMaster {
    owner: Address;
    stakesWallet: Address?;
    rewardsWallet: Address?;

    totalReward: Int;
    stakedAmount: Int;
    accumulator: Int;
    rewardExcesses: Int;

    init(owner: Address) {
        self.owner = owner;
        self.totalReward = 0;
        self.stakedAmount = 0;
        self.accumulator = 0;
        self.rewardExcesses = 0;
    }

    receive(){}
    
    receive(msg: TokenNotification) {
        require(msg.amount > 0, "no amount received");
        if (msg.from == self.owner) {
            if (self.rewardsWallet == null) {
                self.rewardsWallet = context().sender;
            }
            require(context().sender == self.rewardsWallet, "not rewards jetton wallet");
            if (self.stakedAmount == 0) {
                self.rewardExcesses = self.rewardExcesses + msg.amount;
                return;
            }
            self.totalReward = self.totalReward + msg.amount;
            self.accumulator = self.accumulator + msg.amount * 1000000000 / self.stakedAmount;
            return;
        }
        if (self.stakesWallet == null) {
            self.stakesWallet = context().sender;
        }
        require(context().sender == self.stakesWallet, "not stakes jetton wallet");
        let childInit = initOf StakingChild(myAddress(), msg.from);
        let childAddress = contractAddress(childInit);
        self.stakedAmount = self.stakedAmount + msg.amount;

        send(SendParameters{
            to: childAddress,
            value: 0,
            mode: SendRemainingValue,
            body: Stake {
                amount: msg.amount,
                accumulator: self.accumulator
            }.toCell(),
            code: childInit.code,
            data: childInit.data,
        });        

    }

    receive("RewardExcesses") {
        require(context().sender == self.owner, "receive RewardExcesses only from owner");
        let forward_payload: Slice = beginCell().storeUint(0, 8).asSlice();
        send(SendParameters{
            to: self.rewardsWallet!!,
            value: 0,
            mode: SendRemainingValue,
            body: TokenTransfer{
                query_id: 0,
                amount: self.rewardExcesses,
                destination: self.owner,
                response_destination: self.owner,
                custom_payload: null,
                forward_ton_amount: 0,
                forward_payload: forward_payload,
            }.toCell()
        });
    }

    receive(msg: SendTokens) {
        require(context().value > ton("0.5"), "not enough TON");
        let childInit = initOf StakingChild(myAddress(), msg.to);
        let childAddress = contractAddress(childInit);
        require(context().sender == childAddress, "receive SendReward only from Child");
        require(msg.stakedAmount > 0, "not staked amount");
        let reward = msg.reward + (self.accumulator - msg.lastUpdatedAccumulator) * msg.stakedAmount / 1000000000;
        let forward_payload: Slice = beginCell().storeUint(0, 8).asSlice();
        if (reward > 0) {
            self.totalReward = self.totalReward - reward;
            send(SendParameters{
                to: self.rewardsWallet!!,
                value: ton("0.2"),
                body: TokenTransfer{
                    query_id: 0,
                    amount: reward,
                    destination: msg.to,
                    response_destination: msg.to,
                    custom_payload: null,
                    forward_ton_amount: 0,
                    forward_payload: forward_payload,
                }.toCell()
            });
        }

        if (msg.unstake) {
            self.stakedAmount = self.stakedAmount - msg.stakedAmount;
            send(SendParameters{
                to: self.stakesWallet!!,
                value: ton("0.2"),
                body: TokenTransfer{
                    query_id: 0,
                    amount: msg.stakedAmount,
                    destination: msg.to,
                    response_destination: msg.to,
                    custom_payload: null,
                    forward_ton_amount: 0,
                    forward_payload: forward_payload,
                }.toCell()
            });
            return;
        }
        
        send(SendParameters{
            to: childAddress,
            value: 0,
            mode: SendRemainingValue,
            body: UpdateAccumulator {
                accumulator: self.accumulator
            }.toCell(),
            code: childInit.code,
            data: childInit.data,
        });
    }


}

contract StakingChild {
    master: Address;
    owner: Address;
    stakedAmount: Int;
    lastUpdatedAccumulator: Int;
    reward: Int;
    claimingReward: Bool;

    init(master: Address, owner: Address) {
        self.master = master;
        self.owner = owner;
        self.stakedAmount = 0;
        self.lastUpdatedAccumulator = 0;
        self.reward = 0;
        self.claimingReward = false;
    }

    receive(msg: Stake) {
        require(context().sender == self.master, "receive Stake only from master");
        self.reward = self.reward + (msg.accumulator - self.lastUpdatedAccumulator) * self.stakedAmount / 1000000000;
        self.stakedAmount = self.stakedAmount + msg.amount; 
        self.lastUpdatedAccumulator = msg.accumulator;    
    }

    receive(msg: UpdateAccumulator) {
        require(context().sender == self.master, "receive UpdateAccumulator only from master");
        self.lastUpdatedAccumulator = msg.accumulator;
        self.claimingReward = false;
    }

    receive(msg: ClaimReward) {
        require(context().sender == self.owner, "receive ClaimReward only from owner");
        require(!self.claimingReward, "already claiming reward");
        self.claimingReward = true;
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: SendTokens {
                lastUpdatedAccumulator: self.lastUpdatedAccumulator,
                stakedAmount: self.stakedAmount,
                reward: self.reward,
                unstake: false,
                to: self.owner,
            }.toCell()
        });
        self.reward = 0;
    }

    receive(msg: Unstake) {
        require(context().sender == self.owner, "receive Unstake only from owner");
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: SendTokens {
                lastUpdatedAccumulator: self.lastUpdatedAccumulator,
                stakedAmount: self.stakedAmount,
                reward: self.reward,
                unstake: true,
                to: self.owner,
            }.toCell()
        });
        self.stakedAmount = 0;
        self.reward = 0;
    }

    get fun stakedAmount(): Int {
        return self.stakedAmount;
    }

}