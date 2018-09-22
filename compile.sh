#!/bin/bash

OUTPUT_PATH="./bin"
OUTPUT_COMPONENTS="--abi --bin --devdoc"
OPTIMIZATION="--optimize --optimize-runs 200"
EVM_VERSION="--evm-version homestead"
ALLOWED_PATHS="--allow-paths ."
OTHER_FLAGS="--overwrite"

SOLC_OPTIONS="$OUTPUT_COMPONENTS $OPTIMIZATION $EVM_VERSION -o $OUTPUT_PATH $ALLOWED_PATHS $OTHER_FLAGS"

solc $SOLC_OPTIONS contracts/common/ERC20Token.sol
solc $SOLC_OPTIONS contracts/common/QRC20Token.sol
solc $SOLC_OPTIONS contracts/L2Ethereum.sol
solc $SOLC_OPTIONS contracts/L2QTUM.sol