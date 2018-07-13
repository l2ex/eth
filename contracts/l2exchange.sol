pragma solidity ^0.4.24;

import './common/ERC20.sol';
import './common/SafeMath.sol';


contract l2exchange {
  using SafeMath for uint256;

  struct Account {
    // Amount of ether (in weis) or ERC20 tokens stored on the channel
    uint256 balance;
    // Amount of ether (in weis) or ERC20 tokens pending to move to/from (depends on sign of the value) the balance
    int256 change;
    // Index of the last transaction
    uint256 nonce;
  }

  struct Channel {
    // Expiration date (timestamp)
    uint256 expiration;
    // Accounts related with the channel where key of a map is ERC20 token address
    // Zero key [address(0)] is used to store ether balance instead of ERC20 token balance
    mapping(address => Account) accounts;
  }


  // Minimal TTL that can be used to extend existing channel
  uint32 constant TTL_MIN = 1 minutes; // TODO: Short time only for tests
  // Initial TTL for new channels created just after the first deposit
  uint32 constant TTL_DEFAULT = 3 minutes; // TODO: Short time only for tests

  // Address of account which has all permissions to manage channels
  address public owner;
  // Reserved address that can be used only to change owner for emergency
  address public oracle;

  // Existing channels where key of map is address of account which owns a channel
  mapping(address => Channel) channels;

  // Amount of ether (in weis) or ERC20 tokens stored on the contract
  // Zero key [address(0)] is used to store ether balance instead of ERC20 token balance
  mapping(address => uint256) balances;


  event DepositInternal(address indexed token, uint256 amount, uint256 balance);
  event WithdrawInternal(address indexed token, uint256 amount, uint256 balance);

  event Deposit(address indexed channelOwner, address indexed token, uint256 amount, uint256 balance);
  event Withdraw(address indexed channelOwner, address indexed token, uint256 amount, uint256 balance);
  event ChannelUpdate(address indexed channelOwner, uint256 expiration, address indexed token, uint256 balance, int256 change, uint256 nonce);
  event ChannelBalanceChangeApply(address indexed channelOwner, address indexed token, uint256 balance, int256 change, uint256 nonce);
  event ChannelExtend(address indexed channelOwner, uint256 expiration);


  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Throws if called by any account other than the oracle.
   */
  modifier onlyOracle() {
    require(msg.sender == oracle);
    _;
  }

  /**
   * @dev Throws if channel cannot be withdrawn.
   */
  modifier canWithdraw(address token) {
    Channel storage channel = channels[msg.sender];
    Account storage account = channel.accounts[token];
    // There should be something that can be withdrawn on the channel
    require(account.balance > 0 || account.change > 0);
    // The channel should be either prepared for withdraw by owner or expired
    require(account.change == 0 || now >= channel.expiration);
    _;
  }


  /**
   * @dev Constructor sets initial owner and oracle addresses.
   */
  constructor(address _oracle) public {
    owner = msg.sender;
    oracle = _oracle;
  }

  /**
   * @dev Deposits ether to a channel by user.
   */
  function () public payable {
    deposit();
  }

  /**
   * @dev Changes owner address by oracle.
   */
  function changeOwner(address newOwner) public onlyOracle {
    require(newOwner != address(0));
    owner = newOwner;
  }

  /**
   * @dev Deposits ether to the contract.
   */
  function depositInternal() public payable {
    require(msg.value > 0);
    balances[address(0)] = balances[address(0)].add(msg.value);
    emit DepositInternal(address(0), msg.value, balances[address(0)]);
  }

  /**
   * @dev Deposits ERC20 tokens to the contract.
   */
  function depositInternal(address token, uint256 amount) public {
    require(amount > 0);
    // Transfer ERC20 tokens from the sender to the contract and check result
    // Note: At least specified amount of tokens should be allowed to spend by the contract before deposit!
    require(ERC20(token).transferFrom(msg.sender, this, amount));
    balances[token] = balances[token].add(amount);
    emit DepositInternal(token, amount, balances[token]);
  }

  /**
   * @dev Deposits ether to a channel by user.
   */
  function deposit() public payable {
    require(msg.value > 0);
    Channel storage channel = channels[msg.sender];
    Account storage account = channel.accounts[address(0)];
    uint256 expiration = now.add(TTL_DEFAULT);
    if (channel.expiration < expiration) {
      channel.expiration = expiration;
    }
    account.balance = account.balance.add(msg.value);
    emit Deposit(msg.sender, address(0), msg.value, account.balance);
    emit ChannelUpdate(msg.sender, channel.expiration, address(0), account.balance, account.change, account.nonce);
  }

  /**
   * @dev Deposits ERC20 tokens to a channel by user.
   */
  function deposit(address token, uint256 amount) public {
    require(amount > 0);
    // Transfer ERC20 tokens from the sender to the contract and check result
    // Note: At least specified amount of tokens should be allowed to spend by the contract before deposit!
    require(ERC20(token).transferFrom(msg.sender, this, amount));
    Channel storage channel = channels[msg.sender];
    Account storage account = channel.accounts[token];
    uint256 expiration = now.add(TTL_DEFAULT);
    if (channel.expiration < expiration) {
      channel.expiration = expiration;
    }
    account.balance = account.balance.add(amount);
    emit Deposit(msg.sender, token, amount, account.balance);
    emit ChannelUpdate(msg.sender, channel.expiration, token, account.balance, account.change, account.nonce);
  }

  /**
   * @dev Performs withdraw ether to the owner.
   */
  function withdrawInternal(uint256 amount) public onlyOwner {
    if (amount == 0 || amount > balances[address(0)]) {
      amount = balances[address(0)];
    }
    balances[address(0)] = balances[address(0)].sub(amount);
    msg.sender.transfer(amount);
    emit WithdrawInternal(address(0), amount, balances[address(0)]);
  }

  /**
   * @dev Performs withdraw ERC20 token to the owner.
   */
  function withdrawInternal(address token, uint256 amount) public onlyOwner {
    if (amount == 0 || amount > balances[token]) {
      amount = balances[token];
    }
    balances[token] = balances[token].sub(amount);
    require(ERC20(token).transfer(msg.sender, amount));
    emit WithdrawInternal(token, amount, balances[token]);
  }

  /**
   * @dev Performs withdraw ether to user.
   */
  function withdraw(uint256 amount) public canWithdraw(address(0)) {
    // Before widthdraw it is necessary to apply current balance change (if necessary)
    applyBalanceChange(msg.sender, address(0));
    Channel storage channel = channels[msg.sender];
    Account storage account = channel.accounts[address(0)];
    if (amount == 0 || amount > account.balance) {
      amount = account.balance;
    }
    account.balance = account.balance.sub(amount);
    msg.sender.transfer(amount);
    emit Withdraw(msg.sender, address(0), amount, account.balance);
    emit ChannelUpdate(msg.sender, channel.expiration, address(0), account.balance, account.change, account.nonce);
  }

  /**
   * @dev Performs withdraw ERC20 token to user.
   */
  function withdraw(address token, uint256 amount) public canWithdraw(token) {
    // Before widthdraw it is necessary to apply current balance change (if necessary)
    applyBalanceChange(msg.sender, token);
    Channel storage channel = channels[msg.sender];
    Account storage account = channel.accounts[token];
    if (amount == 0 || amount > account.balance) {
      amount = account.balance;
    }
    account.balance = account.balance.sub(amount);
    require(ERC20(token).transfer(msg.sender, amount));
    emit Withdraw(msg.sender, token, amount, account.balance);
    emit ChannelUpdate(msg.sender, channel.expiration, token, account.balance, account.change, account.nonce);
  }

  /**
   * @dev Push offchain transaction with most recent balance change by user or by contract owner (for ether only).
   */
  function pushOffchainBalanceChange(address channelOwner, int256 change, uint256 nonce, uint8 v, bytes32 r, bytes32 s) public {
    pushOffchainBalanceChange(channelOwner, address(0), change, nonce, v, r, s);
  }

  /**
   * @dev Push offchain transaction with most recent balance change by user or by contract owner.
   */
  function pushOffchainBalanceChange(address channelOwner, address token, int256 change, uint256 nonce, uint8 v, bytes32 r, bytes32 s) public {
    Channel storage channel = channels[channelOwner];
    Account storage account = channel.accounts[token];
    require(channel.expiration > 0 && nonce > account.nonce);
    require(change >= 0 || account.balance >= uint256(-change));
    address transactionAuthor = ecrecover(keccak256(abi.encodePacked(channelOwner, token, change, nonce)), v, r, s);
    if (transactionAuthor == channelOwner) {
      // Transaction from user who owns the channel
      // Only contract owner can push offchain transactions from channel owner if the channel not expired
      require(now >= channel.expiration || msg.sender == owner);
    } else if (transactionAuthor == owner) {
      // Transaction from the contract owner
      // No additional limitations for pushing such transactions
    } else {
      // Specified arguments are not valid
      revert();
    }
    account.nonce = nonce;
    account.change = change;
    emit ChannelUpdate(channelOwner, channel.expiration, token, account.balance, account.change, account.nonce);
  }

  /**
   * @dev Changes channel balance according to accumulated balance change.
   */
  function applyBalanceChange(address channelOwner, address token, int256 change, uint256 nonce, uint8 v, bytes32 r, bytes32 s) public onlyOwner {
    Channel storage channel = channels[channelOwner];
    Account storage account = channel.accounts[token];
    require(now < channel.expiration);
    require(account.change != 0 && nonce > account.nonce);
    // Check that balance change apply was requested by channel owner and the same values to apply are requested
    address requester = ecrecover(keccak256(abi.encodePacked(channelOwner, token, change, nonce)), v, r, s);
    require(requester == channelOwner);
    require(account.change == change);
    applyBalanceChange(channelOwner, token);
    account.nonce = nonce;
    emit ChannelBalanceChangeApply(msg.sender, token, account.balance, account.change, account.nonce);
  }

  /**
   * @dev Extends expiration of the channel by user.
   */
  function extendChannel(uint256 ttl) public {
    require(ttl >= TTL_MIN);
    Channel storage channel = channels[msg.sender];
    require(channel.expiration > 0);
    uint256 expiration = now.add(ttl);
    require(channel.expiration < expiration);
    channel.expiration = expiration;
    emit ChannelExtend(msg.sender, channel.expiration);
  }

  function applyBalanceChange(address channelOwner, address token) private {
    Account storage account = channels[channelOwner].accounts[token];
    if (account.change > 0) {
      balances[token] = balances[token].sub(uint256(account.change));
      account.balance = account.balance.add(uint256(account.change));
      account.change = 0;
    } else if (account.change < 0) {
      balances[token] = balances[token].add(uint256(-account.change));
      account.balance = account.balance.sub(uint256(-account.change));
      account.change = 0;
    }
  }
}