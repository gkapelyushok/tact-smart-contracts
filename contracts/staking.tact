import "./jetton/messages";
import "@stdlib/ownable";
import "@stdlib/deploy";


message Unstake {
    indexId: Int as uint32;
}

message ClaimReward {
    indexId: Int as uint32;
}

message ChangePercent {
    percent: Int as uint16;
}

struct StakeRecord {
    stakeAddress: Address;
    jettonStakeAmount: Int as coins;
    stakeTime: Int as uint32;
}


contract StakingContract with Deployable, Ownable {
    contractJettonWallet: Address?;
    owner: Address;
    index: Int as uint32 = 0;
    stakeRecord: map<Int, StakeRecord>;
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

        self.stakeRecord.set(self.index,
            StakeRecord{
                stakeAddress: stake.from, 
                jettonStakeAmount: stake.amount, 
                stakeTime: now(),
            }
        );
        self.index = (self.index + 1);
    }

    receive(msg: ClaimReward){
        require(context().value >= ton("0.1"), "not enough value");
        let stakeRecord: StakeRecord = self.stakeRecord.get(msg.indexId)!!;
        require(context().sender == stakeRecord.stakeAddress, "only staker can claim reward");
        require(stakeRecord.jettonStakeAmount > 0, "don't have value");
        self.stakeRecord.set(msg.indexId, 
            StakeRecord{
                stakeAddress: stakeRecord.stakeAddress, 
                jettonStakeAmount: stakeRecord.jettonStakeAmount, 
                stakeTime: now(),
            }
        );
        let reward = self.apr(stakeRecord);
        send(SendParameters{
                to: self.contractJettonWallet!!,
                value: 0,
                mode: (SendRemainingValue + SendIgnoreErrors),
                bounce: false, // 0x7362d09c - notify new owner
                body: TokenTransfer{
                    query_id: 0,
                    amount: reward,
                    destination: context().sender,
                    response_destination: context().sender,
                    custom_payload: null,
                    forward_ton_amount: ton("0.01"),
                    forward_payload: emptySlice()
                }.toCell()
            }
        );
    }

    receive(msg: Unstake) {
        require(context().value >= ton("0.1"), "not enough value");
        let stakeRecord: StakeRecord = self.stakeRecord.get(msg.indexId)!!;
        require(context().sender == stakeRecord.stakeAddress, "only staker can unstake");
        require(stakeRecord.jettonStakeAmount > 0, "don't have value");
        self.stakeRecord.set(msg.indexId, null);
        let reward = self.apr(stakeRecord);
        send(SendParameters{
                to: self.contractJettonWallet!!,
                value: 0,
                mode: (SendRemainingValue + SendIgnoreErrors),
                bounce: false, // 0x7362d09c - notify new owner
                body: TokenTransfer{
                    query_id: 0,
                    amount: stakeRecord.jettonStakeAmount + reward,
                    destination: context().sender,
                    response_destination: context().sender,
                    custom_payload: null,
                    forward_ton_amount: ton("0.01"),
                    forward_payload: emptySlice()
                }.toCell()
            }
        );
    }

    get fun stakeAmount(index: Int): StakeRecord? {
        return self.stakeRecord.get(index);
    }

    get fun reward(index: Int): Int {
        let stakeRecord: StakeRecord = self.stakeRecord.get(index)!!;
        return self.apr(stakeRecord);
    }

    fun apr(stakeRecord: StakeRecord): Int {
        return stakeRecord.jettonStakeAmount * self.percent * (now() - stakeRecord.stakeTime) / (365 * 24 * 3600 * 10000);
    }
}