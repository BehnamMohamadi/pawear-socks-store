const Cart=require('../../models/shopping-models/cart-model');
const {buildCartSnapshot}=require('./catalog-service');
module.exports={buildCheckout:async userId=>buildCartSnapshot(await Cart.findOne({user:userId}))};
