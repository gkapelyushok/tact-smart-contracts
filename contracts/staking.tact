import "./jetton";

message Unstake {
    index_id: Int as uint32;
}

message ClaimReward {
    index_id: Int as uint32;
}

message ChangePercent {
    percent: Int as uint16;
}

struct StakeRecord {
    stake_address: Address;
    jettonStakeAmount: Int as coins;
    stake_time: Int as uint32;
}


contract StakingContract {
    contractJettonWallet: Address?;
    owner: Address;
    index: Int as uint32 = 0;
    stake_record: map<Int, StakeRecord>;
    percent: Int as uint16;


    init(_owner: Address, _percent: Int){
        self.owner = _owner;
        self.percent = _percent;
    }

    receive(){}

    receive(msg: ChangePercent) {
        self.requireOwner();
        self.percent = msg.percent;
    }

    receive(stake: TokenNotification){
        require(context().value >= ton("0.1"), "not enough value");

        if (self.contractJettonWallet == null) {
            self.contractJettonWallet = context().sender;
        }
        require(context().sender == self.contractJettonWallet, "not from one of any jetton wallet");

        self.stake_record.set(self.index,
            StakeRecord{
                stake_address: stake.from, 
                jettonStakeAmount: stake.amount, 
                stake_time: now(),
            }
        );
        self.index = (self.index + 1);
    }

    receive(msg: ClaimReward){
        let stake_record: StakeRecord = self.stake_record.get(msg.index_id)!!;
        require(stake_record.jettonStakeAmount > 0, "don't have value");
        self.stake_record.set(msg.index_id, 
            StakeRecord{
                stake_address: stake_record.stake_address, 
                jettonStakeAmount: stake_record.jettonStakeAmount, 
                stake_time: now(),
            }
        );
        let reward = self.apr(stake_record);
        send(SendParameters{
                to: self.contractJettonWallet!!,
                value: 0,
                mode: (SendRemainingValue + SendIgnoreErrors),
                bounce: false, // 0x7362d09c - notify new owner
                body: TokenTransfer{
                    query_id: 0,
                    amount: reward,
                    destination: context().sender,
                    response_destination: myAddress(),
                    custom_payload: null,
                    forward_ton_amount: ton("0.1"),
                    forward_payload: emptySlice()
                }.toCell()
            }
        );
    }

    receive(msg: Unstake) {
        let stake_record: StakeRecord = self.stake_record.get(msg.index_id)!!;
        require(stake_record.jettonStakeAmount > 0, "don't have value");
        self.stake_record.set(msg.index_id, null);
        let reward = self.apr(stake_record);
        send(SendParameters{
                to: self.contractJettonWallet!!,
                value: 0,
                mode: (SendRemainingValue + SendIgnoreErrors),
                bounce: false, // 0x7362d09c - notify new owner
                body: TokenTransfer{
                    query_id: 0,
                    amount: stake_record.jettonStakeAmount + reward,
                    destination: context().sender,
                    response_destination: myAddress(),
                    custom_payload: null,
                    forward_ton_amount: ton("0.1"),
                    forward_payload: emptySlice()
                }.toCell()
            }
        );
    }

    get fun stakeAmount(index: Int): StakeRecord? {
        return self.stake_record.get(index);
    }

    fun apr(stake_record: StakeRecord): Int {
        return stake_record.jettonStakeAmount * self.percent * (now() - stake_record.stake_time) / (365 * 24 * 3600 * 100);
    }
}