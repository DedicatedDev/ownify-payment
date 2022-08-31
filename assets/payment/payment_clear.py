
from pyteal import *

def clear_state_program():
    program = Seq(
        [
            App.globalPut(
                Bytes("reserve"),
                App.globalGet(Bytes("reserve"))
                + App.localGet(Int(0), Bytes("balance")),
            ),
            Return(Int(1)),
        ]
    )

    return program


if __name__ == "__main__":
    with open("./assets/payment - clear.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), Mode.Application, version=5)
        f.write(compiled)