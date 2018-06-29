pragma solidity ^0.4.24;

import './common/ERC20.sol';
import './common/SafeMath.sol';


contract l2dex {
  using SafeMath for uint256;

  enum State { CanWithdraw, CantWithdraw }

  struct Channel {
    uint256 expiration; // Expiration date (timestamp)
    uint256 amount;     // Amount of either ether (in weis) or ERC20 token on the channel
    uint32  nonce;      // Index of the last transaction
    State   state;      // State of the channel
  }


  uint32 constant TTL_MIN = 1 days;
  uint32 constant TTL_DEFAULT = 3 days;

  address public owner;
  address public oracle;

  mapping(address => mapping(address => Channel)) public channels;


  event ChannelUpdate(address indexed channelOwner, address indexed token, uint256 expiration, uint256 amount, uint32 nonce);
  event WithdrawRequest(address indexed channelOwner, address indexed token);
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
    require(channels[msg.sender][token].amount > 0);
    require(channels[msg.sender][token].state == State.CanWithdraw ||
      now >= channels[msg.sender][token].expiration);
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
    channels[msg.sender][address(0)].expiration = now.add(TTL_DEFAULT);
    channels[msg.sender][address(0)].amount = channels[msg.sender][address(0)].amount.add(msg.value);
    channels[msg.sender][address(0)].nonce += 1;
    channels[msg.sender][address(0)].state = State.CantWithdraw;
    emit ChannelUpdate(msg.sender, address(0), channels[msg.sender][address(0)].expiration,
      channels[msg.sender][address(0)].amount, channels[msg.sender][address(0)].nonce);
  }

  /**
   * @dev Deposits ERC20 tokens to a channel by user.
   */
  function deposit(address token, uint256 amount) public {
    // Transfer ERC20 tokens from the sender to the contract and check result
    require(ERC20(token).transferFrom(msg.sender, this, amount));
    channels[msg.sender][token].expiration = now.add(TTL_DEFAULT);
    channels[msg.sender][token].amount = channels[msg.sender][token].amount.add(amount);
    channels[msg.sender][token].nonce += 1;
    channels[msg.sender][token].state = State.CantWithdraw;
    emit ChannelUpdate(msg.sender, token, channels[msg.sender][token].expiration,
      channels[msg.sender][token].amount, channels[msg.sender][token].nonce);
  }

  /**
   * @dev Requests withdraw by user (for ether only).
   */
  function requestWithdraw() public {
    requestWithdraw(address(0));
  }

  /**
   * @dev Requests withdraw by user.
   */
  function requestWithdraw(address token) public {
    emit WithdrawRequest(msg.sender, token);
  }

  /**
   * @dev Performs withdraw ether to user.
   */
  function withdraw() public canWithdraw(address(0)) {
    msg.sender.transfer(channels[msg.sender][address(0)].amount);
    channels[msg.sender][address(0)].amount = 0;
    emit Withdraw(msg.sender, address(0), channels[msg.sender][address(0)].amount);
  }

  /**
   * @dev Performs withdraw ERC20 token to user.
   */
  function withdraw(address token) public canWithdraw(token) {
    require(ERC20(token).transfer(msg.sender, channels[msg.sender][token].amount));
    channels[msg.sender][token].amount = 0;
    emit Withdraw(msg.sender, token, channels[msg.sender][token].amount);
  }

  /**
   * @dev Updates channel with most recent amount by user or by contract owner (for ether only).
   */
  function updateChannel(address channelOwner, uint32 nonce, uint256 amount, uint8 v, bytes32 r, bytes32 s) public {
    updateChannel(channelOwner, address(0), nonce, amount, v, r, s);
  }

  /**
   * @dev Updates channel with most recent amount by user or by contract owner.
   */
  function updateChannel(address channelOwner, address token, uint32 nonce, uint256 amount, uint8 v, bytes32 r, bytes32 s) public {
    require(channels[channelOwner][token].nonce > 0 && nonce == channels[channelOwner][token].nonce + 1);
    require(now < channels[channelOwner][token].expiration); // TODO: Is this limitation correct?
    address recoveredOwner = ecrecover(keccak256(abi.encodePacked(channelOwner, nonce, amount)), v, r, s);
    if (recoveredOwner == channelOwner) {
      // Transaction from user who owns the channel
      require(amount < channels[channelOwner][token].amount);
    } else if (recoveredOwner == owner) {
      // Transaction from the contract owner
      require(amount > channels[channelOwner][token].amount);
      channels[channelOwner][token].state = State.CantWithdraw;
    } else {
      // Specified arguments are not valid
      revert();
    }
    channels[channelOwner][token].amount = amount;
    channels[channelOwner][token].nonce = nonce;
    emit ChannelUpdate(channelOwner, token, channels[channelOwner][token].expiration,
      channels[channelOwner][token].amount, channels[channelOwner][token].nonce);
  }

  /**
   * @dev Extends expiration of the channel by user (for ether only).
   */
  function extendChannel(uint256 ttl) public {
    extendChannel(address(0), ttl);
  }

  /**
   * @dev Extends expiration of the channel by user.
   */
  function extendChannel(address token, uint256 ttl) public {
    require(ttl >= TTL_MIN);
    require(channels[msg.sender][token].nonce > 0);
    uint256 expiration = now.add(ttl);
    require(channels[msg.sender][token].expiration <= expiration);
    channels[msg.sender][token].expiration = expiration;
    emit ChannelUpdate(msg.sender, token, channels[msg.sender][token].expiration,
      channels[msg.sender][token].amount, channels[msg.sender][token].nonce);
  }
}