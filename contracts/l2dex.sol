pragma solidity ^0.4.19;

contract l2dex{
    address public l2dex;
    address public oracle;//main oracle
    enum State { canWithdraw, cantWithdraw }
    struct Channel {
        uint256 ttl;
        uint32  nonce;
        uint256 sum;
        State state;
    }
    mapping(address => Channel) public channels;
    event chanelChange(address sender, uint256 ttl, uint256 sum);
    event withdrawRequest(address sender);
    event withdrawChanel(address sender, uint256 sum);
    /**
   * @dev Throws if called by any account other than the l2dex.
   */
    modifier onlyOracle(){
        require(msg.sender == oracle);
        _;
    }
    /**
   * @dev Throws if called by any account other than the l2dex.
   */
    modifier onlyL2dex(){
        require(msg.sender == l2dex);
        _;
    }
    /**
   * @dev Constructor, initial l2dex oracle address.
   */
    function l2dex(address _oracle){
        l2dex = msg.sender;
        oracle = _oracle;
    }
    /**
   * @dev change l2dex address.
   */
   function changeL2dex(address _new) onlyOracle{
       l2dex = _new;
   }
    /**
   * @dev Open or deposit channel by user
   */
    function openChanel(uint256 _ttl) public payable{
        channels[msg.sender].ttl = now+_ttl;
        channels[msg.sender].state = State.cantWithdraw;
        if (channels[msg.sender].nonce>0) { //exist
            channels[msg.sender].sum += msg.value;
        } 
        else{  //new
            channels[msg.sender].sum = msg.value;
            channels[msg.sender].nonce = 0;
        }
        emit chanelChange(msg.sender, channels[msg.sender].ttl, channels[msg.sender].sum );
        
    }
    /**
   * @dev Extend ttl by user
   */
   function updateTtl(uint256 _ttl) public{
       channels[msg.sender].ttl=now+_ttl;
   }
   /**
   * @dev Request withdraw by user
   */
   function withdrawReq() public{
       emit withdrawRequest(msg.sender);
   }
   /**
   * @dev withdraw by user
   */
   function withdraw() public{
       require(channels[msg.sender].state == State.canWithdraw);
       msg.sender.transfer(channels[msg.sender].sum);
       channels[msg.sender].sum = 0;
       emit withdrawChanel(msg.sender, channels[msg.sender].sum);
       
   }
   /**
   * @dev Push last tx 
   */
   function pushTx(address _channelOwner, uint32 _id, uint256 _sum, uint8 v,bytes32 r,bytes32 s) public{
       require(_id>channels[_channelOwner].nonce);
       //require(channels[_channelOwner].sum > 0);
       if (_channelOwner == ecrecover(keccak256(_channelOwner,_id,_sum), v, r, s)) {
           require(channels[_channelOwner].sum >= _sum);
                  channels[_channelOwner].sum = _sum;
                  channels[_channelOwner].nonce = _id;
       } else if (l2dex == ecrecover(keccak256(_channelOwner,_id,_sum), v, r, s)) {
           require(channels[_channelOwner].sum <= _sum);
                  channels[_channelOwner].sum = _sum;
                 channels[_channelOwner].nonce = _id;
       }

       
   }

}