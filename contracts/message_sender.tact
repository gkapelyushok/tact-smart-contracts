import "@stdlib/deploy";
import "@stdlib/ownable";

message Admin {
    admin: Address;
}

contract MessageSender with Deployable, Ownable {
    owner: Address;
    admin: Address;
    i: Int;

    init() {
        self.owner = sender();
        self.admin = sender();
        self.i = 0;
    }

    receive(msg: Admin) {
       self.requireOwner();
       self.admin = msg.admin;
    }

    receive("increment") {
        require(sender() == self.admin, "Only admin can increment");
        self.i = self.i + 1;
    }

    get fun i(): Int {
        return self.i;
    }
}