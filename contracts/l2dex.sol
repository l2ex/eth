pragma solidity ^0.4.24;

import './common/ERC20.sol';
import './common/SafeMath.sol';


contract l2dex {
  using SafeMath for uint256;

  struct Account {
    // Amount of ether (in weis) or ERC20 token stored on the channel
    uint256 balance;
    // Amount of ether (in weis) or ERC20 token pending to move to/from (depends on sign of the value) the balance
    int256 change;
    // Index of the last transaction
    uint32 nonce;
  }

  struct Channel {
    // Expiration date (timestamp)
    uint256 expiration;
    // Accounts related with the channel where key of a map is ERC20 token address
    // Zero key [address(0)] is used to store ether amount instead of ERC20 token amount
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


  event Deposit(address indexed channelOwner, address indexed token, uint256 amount, uint256 balance, int256 change);
  event Withdraw(address indexed channelOwner, address indexed token, uint256 amount, uint256 balance, int256 change);
  event ChannelUpdate(address indexed channelOwner, uint256 expiration, address indexed token, uint256 balance, int256 change, uint32 nonce);
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
    require(channels[msg.sender].accounts[token].balance > 0 || channels[msg.sender].accounts[token].change > 0);
    require(channels[msg.sender].accounts[token].change == 0 || now >= channels[msg.sender].expiration);
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
   * @dev Deposits ether to a channel by user.
   */
  function deposit() public payable {
    require(msg.value > 0);
    Channel storage channel = channels[msg.sender];
    Account storage account = channel.accounts[address(0)];
    channel.expiration = now.add(TTL_DEFAULT);
    account.balance = account.balance.add(msg.value);
    emit Deposit(msg.sender, address(0), msg.value, account.balance, account.change);
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
    channel.expiration = now.add(TTL_DEFAULT);
    account.balance = account.balance.add(amount);
    emit Deposit(msg.sender, token, amount, account.balance, account.change);
    emit ChannelUpdate(msg.sender, channel.expiration, token, account.balance, account.change, account.nonce);
  }

  /**
   * @dev Performs withdraw ether to user.
   */
  function withdraw() public canWithdraw(address(0)) {
    // Before widthdraw it is necessary to apply current balance change
    applyBalanceChange(msg.sender, address(0));
    Account storage account = channels[msg.sender].accounts[address(0)];
    uint256 amount = account.balance;
    account.balance = 0;
    msg.sender.transfer(amount);
    emit Withdraw(msg.sender, address(0), amount, account.balance, account.change);
  }

  /**
   * @dev Performs withdraw ERC20 token to user.
   */
  function withdraw(address token) public canWithdraw(token) {
    // Before widthdraw it is necessary to apply current balance change
    applyBalanceChange(msg.sender, token);
    Account storage account = channels[msg.sender].accounts[token];
    uint256 amount = account.balance;
    account.balance = 0;
    require(ERC20(token).transfer(msg.sender, amount));
    emit Withdraw(msg.sender, token, amount, account.balance, account.change);
  }

  /**
   * @dev Push offchain transaction with most recent balance change by user or by contract owner (for ether only).
   */
  function pushOffchainBalanceChange(address channelOwner, int256 change, uint32 nonce, bytes32 r, bytes32 s, uint8 v) public {
    pushOffchainBalanceChange(channelOwner, address(0), change, nonce, r, s, v);
  }

  /**
   * @dev Push offchain transaction with most recent balance change by user or by contract owner.
   */
  function pushOffchainBalanceChange(address channelOwner, address token, int256 change, uint32 nonce, bytes32 r, bytes32 s, uint8 v) public {
    Channel storage channel = channels[channelOwner];
    Account storage account = channel.accounts[token];
    require(channel.expiration > 0 && nonce > account.nonce);
    require(isBalanceChangeCorrect(account.balance, change));
    address recoveredOwner = ecrecover(keccak256(abi.encodePacked(channelOwner, nonce, change)), v, r, s);
    if (recoveredOwner == channelOwner) {
      // Transaction from user who owns the channel
      require(change < account.change);
      //require(now >= channel.expiration); // TODO: Is this limitation correct?
    } else if (recoveredOwner == owner) {
      // Transaction from the contract owner
      require(change > account.change);
      require(now < channel.expiration); // TODO: Is this limitation correct?
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
   // TODO: Make this possible to call only with signed message from user?
  function applyBalanceChange(address channelOwner, address token, uint32 nonce) public onlyOwner {
    Channel storage channel = channels[channelOwner];
    Account storage account = channel.accounts[token];
    require(account.change != 0 && nonce > account.nonce);
    applyBalanceChange(channelOwner, token);
    account.nonce = nonce;
    emit ChannelUpdate(msg.sender, channel.expiration, token, account.balance, account.change, account.nonce);
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
      account.balance = account.balance.add(uint256(account.change));
      account.change = 0;
    } else if (account.change < 0) {
      account.balance = account.balance.sub(uint256(-account.change));
      account.change = 0;
    }
  }

  function isBalanceChangeCorrect(uint256 balance, int256 change) private pure returns (bool) {
    return change >= 0 || balance >= uint256(-change);
  }
}