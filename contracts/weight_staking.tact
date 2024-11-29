import "./jetton/messages";

message Stake {
    amount: Int;
    accumulator: Int;
}

message SendTokens {
    lastUpdatedAccumulator: Int;
    stakedAmount: Int;
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

    init(owner: Address) {
        self.owner = owner;
        self.totalReward = 0;
        self.stakedAmount = 0;
        self.accumulator = 0;
    }

    receive(){}

    receive(msg: TokenNotification) {
        if (msg.from == self.owner) {
            if (self.rewardsWallet == null) {
                self.rewardsWallet = context().sender;
            }
            require(context().sender == self.rewardsWallet, "not rewards jetton wallet");
            self.totalReward = self.totalReward + msg.amount;
            self.accumulator = self.accumulator + self.totalReward * 1000000000 / self.stakedAmount;
            return;
        }
        if (self.stakesWallet == null) {
            self.stakesWallet = context().sender;
        }
        require(context().sender == self.stakesWallet, "not stakes jetton wallet");
        let childInit = initOf StakingChild(myAddress(), msg.from);
        let childAddress = contractAddress(childInit);
        if (self.stakedAmount == 0) {
        }
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

    receive(msg: SendTokens) {
        require(context().value > ton("0.4"), "not enough TON");
        let childInit = initOf StakingChild(myAddress(), msg.to);
        let childAddress = contractAddress(childInit);
        require(context().sender == childAddress, "receive SendReward only from Child");
        let reward = (self.accumulator - msg.lastUpdatedAccumulator) * msg.stakedAmount / 1000000000;
        self.totalReward = self.totalReward - reward;
        let forward_payload: Slice = beginCell().storeUint(0, 8).asSlice();
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
                    forward_payload: forward_payload
                }.toCell()
            });

        }
        
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
                forward_payload: forward_payload
            }.toCell()
        });

        send(SendParameters{
            to: childAddress,
            value: context().value - ton("0.4"),
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

    init(master: Address, owner: Address) {
        self.master = master;
        self.owner = owner;
        self.stakedAmount = 0;
        self.lastUpdatedAccumulator = 0;
    }

    receive(msg: Stake) {
        require(context().sender == self.master, "receive Stake only from master");
        self.stakedAmount = self.stakedAmount + msg.amount; 
        self.lastUpdatedAccumulator = msg.accumulator;    
    }

    receive(msg: UpdateAccumulator) {
        require(context().sender == self.master, "receive UpdateAccumulator only from master");
        self.lastUpdatedAccumulator = msg.accumulator;
    }

    receive(msg: ClaimReward) {
        require(context().sender == self.owner, "receive ClaimReward only from owner");
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: SendTokens {
                lastUpdatedAccumulator: self.lastUpdatedAccumulator,
                stakedAmount: self.stakedAmount,
                unstake: false,
                to: self.owner,
            }.toCell()
        });
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
                unstake: true,
                to: self.owner,
            }.toCell()
        });
        self.stakedAmount = 0;

    }

    get fun stakedAmount(): Int {
        return self.stakedAmount;
    }

}