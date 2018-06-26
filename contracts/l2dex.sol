pragma solidity ^0.4.19;

contract l2dex{
    address public l2dex;
    
    /**
   * @dev Throws if called by any account other than the l2dex.
   */
    modifier onlyOracle(){
        require(msg.sender == l2dex);
        _;
    }
    /**
   * @dev Constructor, initial l2dex oracle address.
   */
    function l2dex(){
        l2dex = msg.sender;
    }
    /**
   * @dev Open or deposit channel by user
   */
    function openChanel() public payable{
        
    }
    /**
   * @dev Etend ttl by user
   */
   function updateTtl() public{
       
   }
   /**
   * @dev Request withdraw by user
   */
   function withdrawReq() public{
       
   }
   /**
   * @dev withdraw by user
   */
   function withdraw() public{
       
   }
   /**
   * @dev Push last tx by user or by l2dex
   */
   function pushTx() public{
       
   }
    
}