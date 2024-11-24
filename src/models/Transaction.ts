import mongoose, { Document, Schema } from 'mongoose';
import Asset, { IAsset } from './Asset';
import { Currency } from '../utils/enums';
import { fetchExchangeRates } from '../controllers/exchange';

export interface ITransaction extends Document {
  currency: Currency;
  asset: IAsset;
  price: number
  quantity: number
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    currency: {
      type: String,
        enum: [Currency.EUR, Currency.TRY, Currency.USD],
        default: Currency.TRY,
    },
    asset: {
        type: mongoose.Schema.ObjectId,
        ref: 'Asset',
        required: true
      },
      price: {
        type: Number,
        default: 0
      },
      quantity: {
        type: Number,
        default: 0
      }
  },
  { timestamps: true } 
);

// Ortalamayı USD cinsine göre hesaplayacak fonksiyon
const getAverageCost = async function(assetId: string) {
  try {
    // Tüm işlemleri al
    const transactions = await Transaction.find({ asset: assetId });

    let totalAmount= 0;
    let totalQuantity = 0;

    // Her işlem için döviz kuru dönüşümü yap
    for (const transaction of transactions) {

      totalAmount+= transaction.price * transaction.quantity;
      totalQuantity += transaction.quantity;
    }
    // Ortalama maliyeti hesapla
    const averageCost= totalAmount/ totalQuantity;

  
    await Asset.findByIdAndUpdate(assetId, {
      avg_price: Number(averageCost.toFixed(2)), // En yakın 10'a yuvarlama
      amount: totalQuantity
    });

    console.log('Ortalama maliyet TRY cinsinden güncellendi:', averageCost);
  } catch (error) {
    console.error('Ortalama maliyet hesaplama hatası:', error);
  }
};

const setPrice = async(transactionId:string, currency:Currency, price:number, assetId:string) => {
  const {eurToUsd,usd} = await fetchExchangeRates()

  switch(currency) {
    case Currency.EUR:
      const eurPrice = price * eurToUsd
      await Transaction.findByIdAndUpdate(transactionId, {price:eurPrice, currency: Currency.EUR})
      break;
    case Currency.TRY:
      const tryPrice = price / usd;
      await Transaction.findByIdAndUpdate(transactionId, {price:tryPrice, currency: Currency.TRY })
      break;
    default:
      break;
  }
  await getAverageCost(assetId);
}



// Call getAverageCost after save
TransactionSchema.post('save', async function() {
  setPrice(this._id as string, this.currency, this.price, this.asset as any)
});



// Call getAverageCost before remove
TransactionSchema.pre('findOneAndDelete', function() {
  const transactionId = (this as any)._conditions._id;
  getAverageCost(transactionId);
});

// Mongoose modelini dışa aktarıyoruz
const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
