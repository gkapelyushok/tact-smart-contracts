import "@stdlib/ownable";
import "./jetton/messages";

message Stake {
    amount: Int;
    percent: Int;
}

message SendTokens {
    amount: Int;
    reward: Int;
    to: Address;
}

message ChangePercent {
    percent: Int;
}

contract StakingMaster with Ownable {
    percent: Int;
    owner: Address;
    contractJettonWallet: Address?;

    init(owner: Address, percent: Int){
        self.owner = owner;
        self.percent = percent;
    }

    receive(){}

    receive(msg: ChangePercent) {
        self.requireOwner();
        self.percent = msg.percent;
    }

    receive(stake: TokenNotification) {
        if (self.contractJettonWallet == null) {
            self.contractJettonWallet = context().sender;
        }
        require(context().sender == self.contractJettonWallet, "not jetton wallet");
        if (stake.from == self.owner) {
            return;
        }
        let childInit = initOf StakingChild(myAddress(), stake.from);
        let childAddress = contractAddress(childInit);
        send(SendParameters{
            to: childAddress,
            value: 0,
            mode: SendRemainingValue,
            body: Stake {
                amount: stake.amount,
                percent: self.percent
            }.toCell(),
            code: childInit.code,
            data: childInit.data,
        });
    }

    receive(msg: SendTokens) {
        let childInit = initOf StakingChild(myAddress(), msg.to);
        let childAddress = contractAddress(childInit);
        require(context().sender == childAddress, "only child can receive tokens"); 
        send(SendParameters{
            to: self.contractJettonWallet!!,
            value: 0,
            mode: SendRemainingValue,
            body: TokenTransfer{
                query_id: 0,
                amount: msg.amount + msg.reward * self.percent / 10000,
                destination: msg.to,
                response_destination: myAddress(),
                custom_payload: null,
                forward_ton_amount: 0,
                forward_payload: emptySlice()
            }.toCell()
        });
    }
}


message ClaimReward {
}

message Unstake {
}

contract StakingChild {
    master: Address;
    owner: Address;
    stakedAmount: Int;
    startTime: Int?;

    init(master: Address, owner: Address) {
        self.master = master;
        self.owner = owner;
        self.stakedAmount = 0;
    }

    receive(msg: Stake) {
        require(context().sender == self.master, "receive Stake only from master");
        if (self.startTime != null) {
            self.stakedAmount = self.stakedAmount + self.apr() * msg.percent / 10000;
        }
        self.startTime = now();
        self.stakedAmount = self.stakedAmount + msg.amount; 
    }

    receive(msg: ClaimReward) {
        require(context().sender == self.owner, "receive ClaimReward only from owner");
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: SendTokens {
                amount: 0,
                reward: self.apr(),
                to: self.owner,
            }.toCell()
        });
        self.startTime = now();

    }

    receive(msg: Unstake) {
        require(context().sender == self.owner, "receive Unstake only from owner");
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: SendTokens {
                amount: self.stakedAmount,
                reward: self.apr(),
                to: self.owner,
            }.toCell()
        });
        self.startTime = null;
        self.stakedAmount = 0;
    }

    get fun reward(): Int {
        if (self.startTime == null) {
            return 0;
        }
        return self.apr();
    }
    get fun amount(): Int {
        return self.stakedAmount;
    }

    fun apr(): Int {
        require(self.startTime != null, "did not stake");
        return self.stakedAmount * (now() - self.startTime!!) / (365 * 24 * 3600);
    }
}