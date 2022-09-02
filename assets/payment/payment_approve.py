
from pyteal import *

def approval_program():

    def basic_checks(txn: Txn): return And(
        txn.rekey_to() == Global.zero_address(),
        txn.close_remainder_to() == Global.zero_address(),
        txn.asset_close_to() == Global.zero_address()
    )

    #initialize
    on_creation = Seq(
        [
            Assert(
                And(
                    Txn.application_args.length() == Int(2),
                    Len(Txn.application_args[0]) == Int(32),
                )
            ),
            App.globalPut(Bytes("admin"), Txn.application_args[0]),
            App.globalPut(Bytes("fee"), Txn.application_args[1]),
            Approve()
        ]
    )

    #create
    nft_create = Seq([
        Assert(
            And(
                Gtxn[0].application_args.length() == Int(1),
                Global.group_size() == Int(2),
                basic_checks(Gtxn[1]),
                Gtxn[1].type_enum() == TxnType.AssetConfig,
            )
        ),            
        Approve()
    ])

    #transfer 
    nft_transfer = Seq([
        Assert(
            And(
                Gtxn[0].application_args.length() == Int(2),
                Global.group_size() == Int(3),
                basic_checks(Gtxn[1]),
                Gtxn[1].type_enum() == TxnType.Payment,
                Gtxn[1].amount() == atoi(App.globalGet(Bytes("fee"))),
                Gtxn[1].receiver() == Global.current_application_address(),
                basic_checks(Gtxn[2]),
                Gtxn[2].type_enum() == TxnType.AssetTransfer
            )
        ),
        Approve()
    ])

    #withdraw fee from application account. 
    contract_admin = App.globalGet(Bytes("admin"))
    withdraw = Seq(
        [
            Assert(Txn.sender() == contract_admin),
            Assert(Txn.application_args.length() == Int(2)),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.amount: atoi(Txn.application_args[1]),
                TxnField.receiver: Txn.sender()
            }),
            InnerTxnBuilder.Submit(),
            Approve()
        ]
    )

    #change admin of application
    set_admin = Seq(
        [
            Assert(
                And(
                    Global.creator_address() == Txn.sender(),
                    Len(Txn.application_args[1]) == Int(32),
                    Txn.application_args.length() == Int(2),
                )
            ),
            App.globalPut(Bytes("admin"),Txn.application_args[1]),
            Approve(),
        ]
    )

    #change admin of application
    set_fee = Seq(
        [
            Assert(
                And(
                    Global.creator_address() == Txn.sender(),
                    Txn.application_args.length() == Int(2),
                    atoi(Txn.application_args[1]) > Int(0)
                )
            ),
            App.globalPut(Bytes("fee"),Txn.application_args[1]),
            Approve(),
        ]
    )

    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Int(1))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Approve()],
        [Txn.application_args[0] == Bytes("nft_create"),nft_create],
        [Txn.application_args[0] == Bytes("nft_transfer"),nft_transfer],
        [Txn.application_args[0] == Bytes("set admin"), set_admin],
        [Txn.application_args[0] == Bytes("set fee"), set_fee],
        [Txn.application_args[0] == Bytes("withdraw"), withdraw],
    )

    return program

# Magic number to convert between ascii chars and integers
_ascii_zero = 48
_ascii_nine = _ascii_zero + 9
ascii_zero = Int(_ascii_zero)
ascii_nine = Int(_ascii_nine)


@Subroutine(TealType.uint64)
def ascii_to_int(arg):
    """ascii_to_int converts the integer representing a character in ascii to the actual integer it represents
    Args:
        arg: uint64 in the range 48-57 that is to be converted to an integer
    Returns:
        uint64 that is the value the ascii character passed in represents
    """
    return Seq(Assert(arg >= ascii_zero), Assert(arg <= ascii_nine), arg - ascii_zero)

@Subroutine(TealType.uint64)
def pow10(x) -> Expr:
    """
    Returns 10^x, useful for things like total supply of an asset
    """
    return Exp(Int(10), x)

@Subroutine(TealType.uint64)
def atoi(a):
    """atoi converts a byte string representing a number to the integer value it represents"""
    return If(
        Len(a) > Int(0),
        (ascii_to_int(GetByte(a, Int(0))) * pow10(Len(a) - Int(1)))
        + atoi(Substring(a, Int(1), Len(a))),
        Int(0),
    )


if __name__ == "__main__":
    with open("./assets/payment - approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), Mode.Application, version=6)
        f.write(compiled)
