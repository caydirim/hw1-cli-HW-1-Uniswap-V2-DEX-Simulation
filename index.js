import chalk from 'chalk';
import { program } from 'commander';
import fs from 'fs';

const DATA_FILE = './data.json';

// JSON Dosyasını Oku
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// JSON Dosyasına Yaz
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Havuz Durumu
program
  .command('pool-status')
  .description('Havuz durumunu görüntüle')
  .action(() => {
    const data = readData();
    console.log(chalk.blue('Havuz Durumu:'));
    console.log(`Token A: ${data.pool.tokenA}`);
    console.log(`Token B: ${data.pool.tokenB}`);
    console.log(`K (Sabiti): ${data.pool.K}`);
  });

// Swap İşlemi
program
  .command('swap <fromToken> <toToken> <amount>')
  .description('Havuzda token takası gerçekleştirir.')
  .action((fromToken, toToken, amount) => {
    const data = readData();
    const fromTokenKey = `token${fromToken.toUpperCase()}`;
    const toTokenKey = `token${toToken.toUpperCase()}`;

    // Geçerli token olup olmadığını kontrol et
    if (!data.pool[fromTokenKey] || !data.pool[toTokenKey] || !data.userBalance[fromTokenKey]) {
      console.log(chalk.red('Geçersiz token veya yetersiz bakiye! Lütfen doğru bir token adı girin.'));
      return;
    }

    const inputAmount = parseFloat(amount);

    // Kullanıcının bakiyesinin yeterli olup olmadığını kontrol et
    if (data.userBalance[fromTokenKey] < inputAmount) {
      console.log(chalk.red('Yetersiz bakiye!'));
      return;
    }

    // Takas işlemi (x * y = k formülü)
    const outputAmount = calculateSwapOutput(inputAmount, data.pool[fromTokenKey], data.pool[toTokenKey]);

    // Havuzda yeterli miktarda token olup olmadığını kontrol et
    if (outputAmount > data.pool[toTokenKey]) {
      console.log(chalk.red('Havuzda yeterli miktarda token yok!'));
      return;
    }

    // Kullanıcı ve havuz bakiyelerini güncelle
    data.userBalance[fromTokenKey] -= inputAmount;
    data.userBalance[toTokenKey] += outputAmount;

    data.pool[fromTokenKey] += inputAmount;
    data.pool[toTokenKey] -= outputAmount;

    // K sabitinin korunması için
    data.pool.K = data.pool.tokenA * data.pool.tokenB;

    // JSON dosyasını güncelle
    writeData(data);

    console.log(chalk.green(`Başarılı takas! ${amount} ${fromToken} verildi ve ${outputAmount.toFixed(2)} ${toToken} alındı.`));
  });

// Swap Formülü (x * y = k prensibi)
function calculateSwapOutput(inputAmount, reserveIn, reserveOut) {
  const inputWithFee = inputAmount * 0.997; // 0.3% ücret
  const numerator = inputWithFee * reserveOut;
  const denominator = reserveIn + inputWithFee;
  return numerator / denominator;
}

// Likidite Ekleme
program
  .command('add-liquidity <amountA> <amountB>')
  .description('Havuza likidite ekler.')
  .action((amountA, amountB) => {
    const data = readData();
    const tokenAAmount = parseFloat(amountA);
    const tokenBAmount = parseFloat(amountB);

    // Kullanıcı bakiyesinden düşme
    if (data.userBalance.tokenA < tokenAAmount || data.userBalance.tokenB < tokenBAmount) {
      console.log(chalk.red('Yetersiz bakiye!'));
      return;
    }

    // Kullanıcı bakiyelerini güncelle
    data.userBalance.tokenA -= tokenAAmount;
    data.userBalance.tokenB -= tokenBAmount;

    // Havuz bakiyelerini güncelle
    data.pool.tokenA += tokenAAmount;
    data.pool.tokenB += tokenBAmount;

    // K sabitini tekrar hesapla
    data.pool.K = data.pool.tokenA * data.pool.tokenB;

    // JSON dosyasını güncelle
    writeData(data);

    console.log(chalk.green(`Başarılı! ${tokenAAmount} Token A ve ${tokenBAmount} Token B havuza eklendi.`));
  });

// Likidite Çıkarma
program
  .command('remove-liquidity <percent>')
  .description('Havuzdan belirtilen yüzde kadar likidite çeker.')
  .action((percent) => {
    const data = readData();
    const percentToRemove = parseFloat(percent) / 100;

    const tokenARemove = data.pool.tokenA * percentToRemove;
    const tokenBRemove = data.pool.tokenB * percentToRemove;

    // Kullanıcı bakiyesini artırma
    data.userBalance.tokenA += tokenARemove;
    data.userBalance.tokenB += tokenBRemove;

    // Havuzdan çıkarma
    data.pool.tokenA -= tokenARemove;
    data.pool.tokenB -= tokenBRemove;

    // K sabitini tekrar hesapla
    data.pool.K = data.pool.tokenA * data.pool.tokenB;

    // JSON dosyasını güncelle
    writeData(data);

    console.log(chalk.green(`Başarılı! ${tokenARemove.toFixed(2)} Token A ve ${tokenBRemove.toFixed(2)} Token B havuzdan çıkarıldı.`));
  });

// Komutları Parse Et
program.parse(process.argv);
