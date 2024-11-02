import "@stdlib/deploy";

contract Money with Deployable {
    lastSender: Address? = null;
    deployer: Address;

    init() {
        self.deployer = sender();
    }

    receive() {
        if (context().value >= ton("1")) {
            self.lastSender = sender();
        }
    }

    get fun balance(): Int {
        return myBalance(); 
    }

    get fun lastSender(): Address? {
        return self.lastSender;
    }

    receive("withdraw") {
        require(sender() == self.deployer, "Only deployer is allowed to withdraw");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors
        });
    }
}