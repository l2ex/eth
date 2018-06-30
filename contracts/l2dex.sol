pragma solidity ^0.4.23;

import './common/ERC20.sol';
import './common/SafeMath.sol';


contract l2dex {
  using SafeMath for uint256;

  enum State { CanWithdraw, CantWithdraw }

  struct Account {
    // Amount of either ether (in weis) or ERC20 token on the channel
    uint256 amount;
    // State of the account
    State state;
  }

  struct Channel {
    // Expiration date (timestamp)
    uint256 expiration;
    // Index of the last transaction
    uint32 nonce;
    // Accounts related with the channel where key of a map is ERC20 token address
    // Zero key [address(0)] is used to store ether amount instead of ERC20 token amount
    mapping(address => Account) accounts;
  }


  // Minimal TTL that can be used to extend existing channel
  uint32 constant TTL_MIN = 1 days;
  // Initial TTL for new channels created just after the first deposit
  uint32 constant TTL_DEFAULT = 3 days;

  // Address of account which has all permissions to manage channels
  address public owner;
  // Reserved address that can be used only to change owner for emergency
  address public oracle;

  // Existing channels where key of map is address of account which owns a channel
  mapping(address => Channel) channels;


  event ChannelUpdate(address indexed channelOwner, uint256 expiration, uint32 nonce, address indexed token, uint256 amount);
  event ChannelExtend(address indexed channelOwner, uint256 expiration);
  event Withdraw(address indexed channelOwner, address indexed token, uint256 amount);


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
    require(channels[msg.sender].accounts[token].amount > 0);
    require(channels[msg.sender].accounts[token].state == State.CanWithdraw || now >= channels[msg.sender].expiration);
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
    channels[msg.sender].expiration = now.add(TTL_DEFAULT);
    channels[msg.sender].nonce += 1;
    channels[msg.sender].accounts[address(0)].amount = channels[msg.sender].accounts[address(0)].amount.add(msg.value);
    channels[msg.sender].accounts[address(0)].state = State.CantWithdraw;
    emit ChannelUpdate(msg.sender, channels[msg.sender].expiration, channels[msg.sender].nonce,
      address(0), channels[msg.sender].accounts[address(0)].amount);
  }

  /**
   * @dev Deposits ERC20 tokens to a channel by user.
   */
  function deposit(address token, uint256 amount) public {
    require(amount > 0);
    // Transfer ERC20 tokens from the sender to the contract and check result
    // Note: At least specified amount of tokens should be allowed to spend by the contract before deposit!
    require(ERC20(token).transferFrom(msg.sender, this, amount));
    channels[msg.sender].expiration = now.add(TTL_DEFAULT);
    channels[msg.sender].nonce += 1;
    channels[msg.sender].accounts[token].amount = channels[msg.sender].accounts[token].amount.add(amount);
    channels[msg.sender].accounts[token].state = State.CantWithdraw;
    emit ChannelUpdate(msg.sender, channels[msg.sender].expiration, channels[msg.sender].nonce,
      token, channels[msg.sender].accounts[token].amount);
  }

  /**
   * @dev Performs withdraw ether to user.
   */
  function withdraw() public canWithdraw(address(0)) {
    channels[msg.sender].nonce += 1;
    uint256 amount = channels[msg.sender].accounts[address(0)].amount;
    channels[msg.sender].accounts[address(0)].amount = 0;
    msg.sender.transfer(amount);
    emit Withdraw(msg.sender, address(0), amount);
  }

  /**
   * @dev Performs withdraw ERC20 token to user.
   */
  function withdraw(address token) public canWithdraw(token) {
    channels[msg.sender].nonce += 1;
    uint256 amount = channels[msg.sender].accounts[token].amount;
    channels[msg.sender].accounts[token].amount = 0;
    require(ERC20(token).transfer(msg.sender, amount));
    emit Withdraw(msg.sender, token, amount);
  }

  /**
   * @dev Updates channel with most recent amount by user or by contract owner (for ether only).
   */
  function updateChannel(address channelOwner, uint32 nonce, uint256 amount, uint8 v, bytes32 r, bytes32 s) public {
    updateChannel(channelOwner, nonce, address(0), amount, v, r, s);
  }

  /**
   * @dev Updates channel with most recent amount by user or by contract owner.
   */
  function updateChannel(address channelOwner, uint32 nonce, address token, uint256 amount, uint8 v, bytes32 r, bytes32 s) public {
    require(channels[channelOwner].nonce > 0 && nonce == channels[channelOwner].nonce + 1);
    address recoveredOwner = ecrecover(keccak256(abi.encodePacked(channelOwner, nonce, amount)), v, r, s);
    if (recoveredOwner == channelOwner) {
      // Transaction from user who owns the channel
      require(amount < channels[channelOwner].accounts[token].amount);
      //require(now >= channels[channelOwner].expiration); // TODO: Is this limitation correct?
    } else if (recoveredOwner == owner) {
      // Transaction from the contract owner
      require(amount > channels[channelOwner].accounts[token].amount);
      require(now < channels[channelOwner].expiration); // TODO: Is this limitation correct?
      channels[channelOwner].accounts[token].state = State.CantWithdraw;
    } else {
      // Specified arguments are not valid
      revert();
    }
    channels[channelOwner].nonce = nonce;
    channels[channelOwner].accounts[token].amount = amount;
    emit ChannelUpdate(channelOwner, channels[channelOwner].expiration, channels[channelOwner].nonce,
      token, channels[channelOwner].accounts[token].amount);
  }

  /**
   * @dev Extends expiration of the channel by user.
   */
  function extendChannel(uint256 ttl) public {
    require(ttl >= TTL_MIN);
    require(channels[msg.sender].nonce > 0);
    uint256 expiration = now.add(ttl);
    require(channels[msg.sender].expiration < expiration);
    channels[msg.sender].expiration = expiration;
    emit ChannelExtend(msg.sender, channels[msg.sender].expiration);
  }
}